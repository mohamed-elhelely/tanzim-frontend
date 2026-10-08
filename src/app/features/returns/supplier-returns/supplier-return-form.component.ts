import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { CodedRef, InventoryRef } from '../../inventory/inventory.models';
import { SupplierService } from '../../inventory/suppliers/supplier.service';
import { ProductVariantService } from '../../inventory/variants/product-variant.service';
import { ItemOption, toItemOption, trimZeros } from '../../inventory/variants/variant-options';
import { WarehouseService } from '../../inventory/warehouses/warehouse.service';
import { SupplierReturnPayload } from '../returns.models';
import { SupplierReturnService } from './supplier-return.service';

const QUANTITY = /^\d+(\.\d{1,3})?$/;
const MONEY = /^\d+(\.\d{1,4})?$/;

interface Row {
  variant: number | null;
  quantity: string;
  unitCost: string;
}

/**
 * New supplier return: supplier, warehouse, reason and items with their cost (defaults to the item's standard
 * cost). The stock leaves when the return is approved. Returns aren't edited afterwards (no nested update).
 */
@Component({
  selector: 'app-supplier-return-form',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './supplier-return-form.component.html',
})
export class SupplierReturnFormComponent implements OnInit {
  private readonly api = inject(SupplierReturnService);
  private readonly suppliersApi = inject(SupplierService);
  private readonly warehousesApi = inject(WarehouseService);
  private readonly variantsApi = inject(ProductVariantService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly linesError = signal<string | null>(null);
  readonly suppliers = signal<InventoryRef[]>([]);
  readonly warehouses = signal<CodedRef[]>([]);
  readonly items = signal<ItemOption[]>([]);
  rows: Row[] = [{ variant: null, quantity: '1', unitCost: '' }];
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    supplier: [null as number | null, Validators.required],
    warehouse: [null as number | null, Validators.required],
    return_reason: ['', [Validators.required, Validators.maxLength(255)]],
  });

  ngOnInit(): void {
    forkJoin({
      suppliers: this.suppliersApi.dropdown<InventoryRef>(),
      warehouses: this.warehousesApi.dropdown<CodedRef>(),
      variants: this.variantsApi.listAll(),
    }).subscribe({
      next: ({ suppliers, warehouses, variants }) => {
        this.suppliers.set(suppliers);
        this.warehouses.set(warehouses);
        this.items.set(variants.filter((variant) => variant.is_active).map(toItemOption));
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  /** Picking an item fills in its standard cost when the cost is still empty. */
  onItemChange(row: Row): void {
    const cost = this.items().find((item) => item.value === row.variant)?.cost;
    if (cost && !row.unitCost) {
      row.unitCost = trimZeros(cost);
    }
  }

  addRow(): void {
    this.rows = [...this.rows, { variant: null, quantity: '1', unitCost: '' }];
  }

  removeRow(index: number): void {
    this.rows = this.rows.filter((_, i) => i !== index);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const invalid = this.rows.some(
      (row) =>
        row.variant === null ||
        !QUANTITY.test(row.quantity.trim()) ||
        Number(row.quantity) <= 0 ||
        !MONEY.test(row.unitCost.trim()),
    );
    if (invalid || this.rows.length === 0) {
      this.linesError.set(invalid ? 'returns.hints.supplierLine' : 'returns.hints.atLeastOneLine');
      return;
    }
    this.linesError.set(null);
    const value = this.form.getRawValue();
    const payload: SupplierReturnPayload = {
      supplier: value.supplier as number,
      warehouse: value.warehouse as number,
      return_reason: value.return_reason.trim(),
      lines: this.rows.map((row) => ({
        product: this.items().find((item) => item.value === row.variant)?.product as number,
        quantity: row.quantity.trim(),
        unit_cost: row.unitCost.trim(),
        notes: '',
      })),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    this.api.create(payload).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        void this.router.navigate(['/returns/supplier', created.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/returns/supplier']);
  }
}
