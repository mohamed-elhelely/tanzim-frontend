import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, forkJoin, switchMap, tap } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { LineRow, syncLines } from '../../../shared/utils/sync-lines';
import {
  ADJUSTMENT_REASONS,
  AdjustmentReason,
  CodedRef,
  StockAdjustment,
  StockAdjustmentLine,
  StockAdjustmentLinePayload,
} from '../inventory.models';
import { InventoryReportService } from '../stock-levels/inventory-report.service';
import { ProductVariantService } from '../variants/product-variant.service';
import { ItemOption, toItemOption, trimZeros } from '../variants/variant-options';
import { WarehouseService } from '../warehouses/warehouse.service';
import { StockAdjustmentLineService } from './stock-adjustment-line.service';
import { StockAdjustmentService } from './stock-adjustment.service';

const QUANTITY = /^\d+(\.\d{1,3})?$/;
const MONEY = /^\d+(\.\d{1,4})?$/;

type LineForm = FormGroup<{
  id: FormControl<number | null>;
  product_variant: FormControl<number | null>;
  current_quantity: FormControl<string>;
  new_quantity: FormControl<string>;
  unit_cost: FormControl<string>;
  notes: FormControl<string>;
}>;

/**
 * Create or edit a draft adjustment and its lines. Each line says what the warehouse should hold (`new_quantity`);
 * 🧠 `current_quantity` is filled from the stock on hand in the chosen warehouse (inventory valuation report) and
 * refreshed when the warehouse changes, so the difference the backend posts matches the stock. Unit cost defaults
 * to the variant's standard cost. Saved like transfers: the adjustment first, then `syncLines`.
 */
@Component({
  selector: 'app-stock-adjustment-form',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-adjustment-form.component.html',
})
export class StockAdjustmentFormComponent implements OnInit {
  private readonly api = inject(StockAdjustmentService);
  private readonly linesApi = inject(StockAdjustmentLineService);
  private readonly warehousesApi = inject(WarehouseService);
  private readonly variantsApi = inject(ProductVariantService);
  private readonly reportApi = inject(InventoryReportService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly notDraft = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly warehouses = signal<CodedRef[]>([]);
  readonly warehouseOptions = computed(() => this.warehouses().map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })));
  readonly reasonOptions = ADJUSTMENT_REASONS.map((reason) => ({ value: reason, label: `inventory.adjustmentReasons.${reason}` }));
  readonly items = signal<ItemOption[]>([]);
  private onHand = new Map<number, number>();
  private savedLineIds: number[] = [];

  readonly form = this.fb.group({
    warehouse: [null as number | null, Validators.required],
    reason: ['count' as AdjustmentReason, Validators.required],
    notes: [''],
    lines: this.fb.array<LineForm>([], Validators.required),
  });

  get lines(): FormArray<LineForm> {
    return this.form.controls.lines;
  }

  ngOnInit(): void {
    this.form.controls.warehouse.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((warehouse) => this.loadOnHand(warehouse));
    forkJoin({
      warehouses: this.warehousesApi.dropdown<CodedRef>(),
      variants: this.variantsApi.listAll(),
    }).subscribe({
      next: ({ warehouses, variants }) => {
        this.warehouses.set(warehouses);
        this.items.set(variants.filter((variant) => variant.is_active).map(toItemOption));
        if (this.id !== null) {
          this.loadAdjustment(this.id);
        } else {
          this.addLine();
          this.loading.set(false);
        }
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  addLine(line?: StockAdjustmentLine): void {
    this.lines.push(
      this.fb.group({
        id: this.fb.control<number | null>(line?.id ?? null),
        product_variant: this.fb.control<number | null>(line?.product_variant.id ?? null, Validators.required),
        current_quantity: [line ? trimZeros(line.current_quantity) || '0' : '0'],
        new_quantity: [line ? trimZeros(line.new_quantity) || '0' : '', [Validators.required, Validators.pattern(QUANTITY)]],
        unit_cost: [line?.unit_cost ? trimZeros(line.unit_cost) : '', Validators.pattern(MONEY)],
        notes: [line?.notes ?? '', Validators.maxLength(255)],
      }),
    );
  }

  removeLine(index: number): void {
    this.lines.removeAt(index);
    this.lines.markAsDirty();
  }

  /** A picked item takes its current stock and, when empty, its standard cost. */
  onItemChange(index: number, variant: number | null): void {
    const line = this.lines.at(index);
    line.controls.current_quantity.setValue(this.currentFor(variant));
    const cost = this.items().find((item) => item.value === variant)?.cost;
    if (!line.controls.unit_cost.value && cost) {
      line.controls.unit_cost.setValue(trimZeros(cost));
    }
  }

  differenceAt(index: number): number | null {
    const line = this.lines.at(index).getRawValue();
    if (line.new_quantity === '' || !QUANTITY.test(line.new_quantity)) {
      return null;
    }
    return Number(line.new_quantity) - Number(line.current_quantity || 0);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const header = { warehouse: value.warehouse as number, reason: value.reason, notes: value.notes.trim() };
    this.saving.set(true);
    this.formErrors.set([]);
    const saveHeader: Observable<StockAdjustment> = this.id !== null ? this.api.update(this.id, header) : this.api.create(header);
    let adjustmentId = this.id;
    let linesStarted = false;
    saveHeader
      .pipe(
        tap(() => (linesStarted = true)),
        switchMap((adjustment) => {
          adjustmentId = adjustment.id;
          const rows: LineRow<StockAdjustmentLinePayload>[] = value.lines.map((line) => ({
            id: line.id,
            body: {
              adjustment: adjustment.id,
              product_variant: line.product_variant as number,
              current_quantity: line.current_quantity || '0',
              new_quantity: line.new_quantity.trim(),
              unit_cost: line.unit_cost.trim() || null,
              notes: line.notes.trim(),
            },
          }));
          return syncLines(this.linesApi, this.savedLineIds, rows);
        }),
      )
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifications.success(this.translate.instant('common.saved'));
          void this.router.navigate(['/inventory/adjustments', adjustmentId]);
        },
        error: (error: AppError) => this.onSaveError(error, linesStarted ? adjustmentId : null),
      });
  }

  goBack(): void {
    void this.router.navigate(this.id !== null ? ['/inventory/adjustments', this.id] : ['/inventory/adjustments']);
  }

  private currentFor(variant: number | null): string {
    return variant === null ? '0' : trimZeros(String(this.onHand.get(variant) ?? 0)) || '0';
  }

  private loadAdjustment(id: number): void {
    forkJoin({ adjustment: this.api.retrieve(id), lines: this.linesApi.forAdjustment(id) }).subscribe({
      next: ({ adjustment, lines }) => {
        if (adjustment.status !== 'draft') {
          this.notDraft.set(true);
          this.loading.set(false);
          return;
        }
        this.savedLineIds = lines.map((line) => line.id);
        lines.forEach((line) => this.addLine(line));
        // Patching the warehouse loads its stock, which refreshes every line's current quantity.
        this.form.patchValue({ warehouse: adjustment.warehouse.id, reason: adjustment.reason, notes: adjustment.notes });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private loadOnHand(warehouse: number | null): void {
    if (warehouse === null) {
      this.onHand = new Map();
      return;
    }
    this.reportApi.valuation({ warehouse: String(warehouse) }).subscribe({
      next: (report) => {
        this.onHand = new Map(report.rows.map((row) => [row.variant_id, row.quantity]));
        for (const line of this.lines.controls) {
          line.controls.current_quantity.setValue(this.currentFor(line.controls.product_variant.value));
        }
      },
      error: () => undefined, // current quantities stay as they are; the backend still posts new − current
    });
  }

  /** `savedAdjustment` is set when the adjustment itself saved and a line failed. */
  private onSaveError(error: AppError, savedAdjustment: number | null): void {
    this.saving.set(false);
    this.formErrors.set(handleSaveError(this.form, error, this.notifications));
    if (savedAdjustment === null) {
      return;
    }
    // Some lines may have saved: show what the server has so a retry doesn't create them twice.
    if (this.id === null) {
      void this.router.navigate(['/inventory/adjustments', savedAdjustment, 'edit']);
    } else {
      this.lines.clear();
      this.loadAdjustment(this.id);
    }
  }
}
