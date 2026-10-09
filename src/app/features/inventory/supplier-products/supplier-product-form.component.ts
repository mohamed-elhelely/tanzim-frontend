import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { SelectOption } from '../../company/company.models';
import { InventoryRef, SupplierProductPayload, VariantRef } from '../inventory.models';
import { SupplierService } from '../suppliers/supplier.service';
import { ProductVariantService } from '../variants/product-variant.service';
import { trimZeros } from '../variants/variant-options';
import { SupplierProductService } from './supplier-product.service';

const DECIMAL_4 = /^\d+(\.\d{1,4})?$/;
const DECIMAL_3 = /^\d+(\.\d{1,3})?$/;

/** Today as YYYY-MM-DD in the user's time zone (what <input type="date"> uses). */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-supplier-product-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './supplier-product-form.component.html',
})
export class SupplierProductFormComponent implements OnInit {
  private readonly api = inject(SupplierProductService);
  private readonly suppliersApi = inject(SupplierService);
  private readonly variantsApi = inject(ProductVariantService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly supplierOptions = signal<SelectOption[]>([]);
  readonly variantOptions = signal<SelectOption[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    supplier: [null as number | null, [Validators.required]],
    product_variant: [null as number | null, [Validators.required]],
    supplier_sku: ['', [Validators.maxLength(100)]],
    supplier_product_name: ['', [Validators.maxLength(200)]],
    unit_cost: ['', [Validators.required, Validators.pattern(DECIMAL_4)]],
    currency: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]],
    min_order_qty: ['', [Validators.pattern(DECIMAL_3)]],
    max_order_qty: ['', [Validators.pattern(DECIMAL_3)]],
    lead_time_days: ['', [Validators.pattern(/^\d+$/)]],
    is_preferred: [false],
    is_primary: [false],
    effective_from: ['', [Validators.required]],
    effective_to: [''],
    notes: [''],
  });

  ngOnInit(): void {
    this.suppliersApi.dropdown<InventoryRef>().subscribe({
      next: (items) => this.supplierOptions.set(items.map((item) => ({ value: item.id, label: item.name }))),
      error: () => this.supplierOptions.set([]),
    });
    this.variantsApi.dropdown<VariantRef>().subscribe({
      next: (items) => this.variantOptions.set(items.map((item) => ({ value: item.id, label: `${item.sku} — ${item.name}` }))),
      error: () => this.variantOptions.set([]),
    });
    if (this.id !== null) {
      this.loadSupplierProduct(this.id);
    } else {
      // The backend's defaults (currency USD, min qty 1); a price list entry starts today unless changed.
      this.form.patchValue({ currency: 'USD', min_order_qty: '1', effective_from: today() });
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const leadTime = value.lead_time_days.trim();
    const payload: SupplierProductPayload = {
      supplier: value.supplier,
      product_variant: value.product_variant,
      supplier_sku: value.supplier_sku.trim(),
      supplier_product_name: value.supplier_product_name.trim(),
      unit_cost: value.unit_cost.trim(),
      currency: value.currency.trim().toUpperCase(),
      min_order_qty: value.min_order_qty.trim() || '1',
      max_order_qty: value.max_order_qty.trim() || null,
      lead_time_days: leadTime ? Number(leadTime) : null,
      is_preferred: value.is_preferred,
      is_primary: value.is_primary,
      effective_from: value.effective_from,
      effective_to: value.effective_to || null,
      notes: value.notes.trim(),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, payload) : this.api.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/inventory/supplier-products']);
  }

  private loadSupplierProduct(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (record) => {
        this.form.patchValue({
          supplier: record.supplier?.id ?? null,
          product_variant: record.product_variant?.id ?? null,
          supplier_sku: record.supplier_sku,
          supplier_product_name: record.supplier_product_name,
          unit_cost: trimZeros(record.unit_cost),
          currency: record.currency,
          min_order_qty: trimZeros(record.min_order_qty),
          max_order_qty: trimZeros(record.max_order_qty),
          lead_time_days: record.lead_time_days === null ? '' : String(record.lead_time_days),
          is_preferred: record.is_preferred,
          is_primary: record.is_primary,
          effective_from: record.effective_from,
          effective_to: record.effective_to ?? '',
          notes: record.notes,
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    this.formErrors.set(handleSaveError(this.form, error, this.notifications));
  }
}
