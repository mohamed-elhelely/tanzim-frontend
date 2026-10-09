import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
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
import { CodedRef, StockTransfer, StockTransferLine, StockTransferLinePayload } from '../inventory.models';
import { InventoryReportService } from '../stock-levels/inventory-report.service';
import { ProductVariantService } from '../variants/product-variant.service';
import { ItemOption, toItemOption, trimZeros } from '../variants/variant-options';
import { WarehouseService } from '../warehouses/warehouse.service';
import { StockTransferLineService } from './stock-transfer-line.service';
import { StockTransferService } from './stock-transfer.service';

const QUANTITY = /^\d+(\.\d{1,3})?$/;

type LineForm = FormGroup<{
  id: FormControl<number | null>;
  product_variant: FormControl<number | null>;
  quantity_requested: FormControl<string>;
  notes: FormControl<string>;
}>;

/** The backend refuses a transfer to the same warehouse when it is submitted; say so while editing. */
function differentWarehouses(group: AbstractControl): ValidationErrors | null {
  const { source_warehouse, destination_warehouse } = group.value as { source_warehouse: number | null; destination_warehouse: number | null };
  return source_warehouse !== null && source_warehouse === destination_warehouse ? { sameWarehouse: true } : null;
}

function positive(control: AbstractControl): ValidationErrors | null {
  return control.value !== '' && Number(control.value) <= 0 ? { greaterThan: { min: 0 } } : null;
}

/**
 * Create or edit a draft transfer and its lines. 🧠 The transfer is saved first, then its lines one by one
 * (`syncLines`: removed lines deleted, kept ones updated, new ones created). Each line shows what the source
 * warehouse has on hand (inventory valuation report); the backend checks stock when the transfer ships.
 */
@Component({
  selector: 'app-stock-transfer-form',
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
  templateUrl: './stock-transfer-form.component.html',
})
export class StockTransferFormComponent implements OnInit {
  private readonly api = inject(StockTransferService);
  private readonly linesApi = inject(StockTransferLineService);
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
  /** Only drafts can be edited. */
  readonly notDraft = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly warehouses = signal<CodedRef[]>([]);
  readonly warehouseOptions = computed(() => this.warehouses().map((w) => ({ value: w.id, label: `${w.name} (${w.code})` })));
  readonly items = signal<ItemOption[]>([]);
  /** On hand per variant in the chosen source warehouse. */
  readonly onHand = signal<ReadonlyMap<number, number>>(new Map());
  private savedLineIds: number[] = [];

  readonly form = this.fb.group(
    {
      source_warehouse: [null as number | null, Validators.required],
      destination_warehouse: [null as number | null, Validators.required],
      expected_delivery_date: [''],
      notes: [''],
      lines: this.fb.array<LineForm>([], Validators.required),
    },
    { validators: differentWarehouses },
  );

  get lines(): FormArray<LineForm> {
    return this.form.controls.lines;
  }

  ngOnInit(): void {
    this.form.controls.source_warehouse.valueChanges
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
          this.loadTransfer(this.id);
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

  addLine(line?: StockTransferLine): void {
    this.lines.push(
      this.fb.group({
        id: this.fb.control<number | null>(line?.id ?? null),
        product_variant: this.fb.control<number | null>(line?.product_variant.id ?? null, Validators.required),
        quantity_requested: [line ? trimZeros(line.quantity_requested) : '', [Validators.required, Validators.pattern(QUANTITY), positive]],
        notes: [line?.notes ?? '', Validators.maxLength(255)],
      }),
    );
  }

  removeLine(index: number): void {
    this.lines.removeAt(index);
    this.lines.markAsDirty();
  }

  onHandAt(index: number): number | null {
    const variant = this.lines.at(index).controls.product_variant.value;
    if (variant === null || this.form.controls.source_warehouse.value === null) {
      return null;
    }
    return this.onHand().get(variant) ?? 0;
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const header = {
      source_warehouse: value.source_warehouse as number,
      destination_warehouse: value.destination_warehouse as number,
      expected_delivery_date: value.expected_delivery_date || null,
      notes: value.notes.trim(),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const saveHeader: Observable<StockTransfer> = this.id !== null ? this.api.update(this.id, header) : this.api.create(header);
    let transferId = this.id;
    let linesStarted = false;
    saveHeader
      .pipe(
        tap(() => (linesStarted = true)),
        switchMap((transfer) => {
          transferId = transfer.id;
          const rows: LineRow<StockTransferLinePayload>[] = value.lines.map((line) => ({
            id: line.id,
            body: {
              transfer: transfer.id,
              product_variant: line.product_variant as number,
              quantity_requested: line.quantity_requested.trim(),
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
          void this.router.navigate(['/inventory/transfers', transferId]);
        },
        error: (error: AppError) => this.onSaveError(error, linesStarted ? transferId : null),
      });
  }

  goBack(): void {
    void this.router.navigate(this.id !== null ? ['/inventory/transfers', this.id] : ['/inventory/transfers']);
  }

  private loadTransfer(id: number): void {
    forkJoin({ transfer: this.api.retrieve(id), lines: this.linesApi.forTransfer(id) }).subscribe({
      next: ({ transfer, lines }) => {
        if (transfer.status !== 'draft') {
          this.notDraft.set(true);
          this.loading.set(false);
          return;
        }
        this.form.patchValue({
          source_warehouse: transfer.source_warehouse.id,
          destination_warehouse: transfer.destination_warehouse.id,
          expected_delivery_date: transfer.expected_delivery_date ?? '',
          notes: transfer.notes,
        });
        this.savedLineIds = lines.map((line) => line.id);
        lines.forEach((line) => this.addLine(line));
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private loadOnHand(warehouse: number | null): void {
    this.onHand.set(new Map());
    if (warehouse === null) {
      return;
    }
    this.reportApi.valuation({ warehouse: String(warehouse) }).subscribe({
      next: (report) => this.onHand.set(new Map(report.rows.map((row) => [row.variant_id, row.quantity]))),
      error: () => undefined, // the hint just stays empty
    });
  }

  /** `savedTransfer` is set when the transfer itself saved and a line failed. */
  private onSaveError(error: AppError, savedTransfer: number | null): void {
    this.saving.set(false);
    this.formErrors.set(handleSaveError(this.form, error, this.notifications));
    if (savedTransfer === null) {
      return;
    }
    // Some lines may have saved: show what the server has so a retry doesn't create them twice.
    if (this.id === null) {
      void this.router.navigate(['/inventory/transfers', savedTransfer, 'edit']);
    } else {
      this.lines.clear();
      this.loadTransfer(this.id);
    }
  }
}
