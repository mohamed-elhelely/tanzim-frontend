import { DecimalPipe, UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { forkJoin } from 'rxjs';
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
import { CodedRef, ProductVariant } from '../../inventory/inventory.models';
import { ProductVariantService } from '../../inventory/variants/product-variant.service';
import { ItemOption, toItemOption, trimZeros } from '../../inventory/variants/variant-options';
import { WarehouseService } from '../../inventory/warehouses/warehouse.service';
import { AddressFieldsComponent, addressGroup, patchAddress, toAddress } from '../address-fields/address-fields.component';
import { CustomerService } from '../customers/customer.service';
import {
  CustomerListItem,
  ORDER_PRIORITIES,
  OrderPriority,
  SalesOrder,
  SalesOrderLine,
  SalesOrderPayload,
  lineTax,
  lineTotal,
} from '../sales.models';
import { SalesOrderService } from './sales-order.service';

const QUANTITY = /^\d+(\.\d{1,3})?$/;
const MONEY = /^\d+(\.\d{1,4})?$/;
const PERCENT = /^\d{1,3}(\.\d{1,2})?$/;

type LineForm = FormGroup<{
  product: FormControl<number | null>;
  variant: FormControl<number | null>;
  description: FormControl<string>;
  quantity_ordered: FormControl<string>;
  unit_price: FormControl<string>;
  discount_percent: FormControl<string>;
  tax_percent: FormControl<string>;
  notes: FormControl<string>;
}>;

function positive(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && Number(control.value) <= 0 ? { greaterThan: { value: 0 } } : null;
}

function atMost100(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && Number(control.value) > 100 ? { max: { max: 100 } } : null;
}

/** Today as YYYY-MM-DD in the user's time zone (what <input type="date"> uses). */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Create or edit a draft sales order with its lines.
 * 🧠 Saving sends every line: the backend deletes the order's lines and recreates them (line ids change).
 * Only drafts are editable (the backend refuses the rest).
 */
@Component({
  selector: 'app-sales-order-form',
  imports: [
    DecimalPipe,
    UpperCasePipe,
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
    AddressFieldsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-order-form.component.html',
})
export class SalesOrderFormComponent implements OnInit {
  private readonly api = inject(SalesOrderService);
  private readonly customersApi = inject(CustomerService);
  private readonly warehousesApi = inject(WarehouseService);
  private readonly variantsApi = inject(ProductVariantService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  /** Set when the order being edited is no longer a draft. */
  readonly notDraft = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly customers = signal<CustomerListItem[]>([]);
  readonly warehouses = signal<CodedRef[]>([]);
  readonly items = signal<ItemOption[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly priorityOptions = ORDER_PRIORITIES.map((priority) => ({ value: priority, label: `sales.priorities.${priority}` }));

  readonly customerOptions = computed(() =>
    this.customers()
      .filter((customer) => customer.is_active || customer.id === this.formValue().customer)
      .map((customer) => ({ value: customer.id, label: `${customer.name} (${customer.customer_number})` })),
  );

  readonly form = this.fb.group({
    customer: this.fb.control<number | null>(null, Validators.required),
    warehouse: this.fb.control<number | null>(null, Validators.required),
    required_date: [''],
    priority: ['normal' as OrderPriority],
    reference: ['', [Validators.maxLength(100)]],
    payment_terms: ['', [Validators.maxLength(100)]],
    currency: ['USD', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]],
    discount_amount: ['0', [Validators.pattern(MONEY)]],
    shipping_cost: ['0', [Validators.pattern(MONEY)]],
    shipping_address: addressGroup(this.fb),
    billing_address: addressGroup(this.fb),
    notes: [''],
    internal_notes: [''],
    lines: this.fb.array<LineForm>([], Validators.required),
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Same formula as the backend, so the preview matches what is saved. */
  readonly totals = computed(() => {
    const value = this.formValue();
    let subtotal = 0;
    let tax = 0;
    for (const line of value.lines ?? []) {
      const total = lineTotal(Number(line.quantity_ordered) || 0, Number(line.unit_price) || 0, Number(line.discount_percent) || 0);
      subtotal += total;
      tax += lineTax(total, Number(line.tax_percent) || 0);
    }
    const shipping = Number(value.shipping_cost) || 0;
    const discount = Number(value.discount_amount) || 0;
    return { subtotal, tax, shipping, discount, total: subtotal + tax + shipping - discount };
  });

  get lines(): FormArray<LineForm> {
    return this.form.controls.lines;
  }

  ngOnInit(): void {
    forkJoin({
      customers: this.customersApi.all(),
      warehouses: this.warehousesApi.dropdown<CodedRef>(),
      variants: this.variantsApi.listAll(),
    }).subscribe({
      next: ({ customers, warehouses, variants }) => {
        this.customers.set(customers);
        this.warehouses.set(warehouses);
        this.items.set(variants.filter((variant) => variant.is_active).map(toItemOption));
        if (this.id !== null) {
          this.loadOrder(this.id, variants);
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

  lineTotalAt(index: number): number {
    const line = this.lines.at(index).getRawValue();
    return lineTotal(Number(line.quantity_ordered) || 0, Number(line.unit_price) || 0, Number(line.discount_percent) || 0);
  }

  addLine(line?: SalesOrderLine): void {
    this.lines.push(
      this.fb.group({
        product: this.fb.control<number | null>(line?.product ?? null),
        variant: this.fb.control<number | null>(line?.variant ?? null, Validators.required),
        description: [line?.description ?? '', [Validators.maxLength(500)]],
        quantity_ordered: [trimZeros(line?.quantity_ordered) || '1', [Validators.required, Validators.pattern(QUANTITY), positive]],
        unit_price: [trimZeros(line?.unit_price) || '', [Validators.required, Validators.pattern(MONEY)]],
        discount_percent: [trimZeros(line?.discount_percent) || '0', [Validators.pattern(PERCENT), atMost100]],
        tax_percent: [trimZeros(line?.tax_percent) || '0', [Validators.pattern(PERCENT), atMost100]],
        notes: [line?.notes ?? ''],
      }),
    );
  }

  removeLine(index: number): void {
    this.lines.removeAt(index);
    this.lines.markAsDirty();
  }

  /** Picking an item sets its product and, when the price is still empty, the item's standard price. */
  onItemChange(index: number, variantId: number | null): void {
    const option = this.items().find((item) => item.value === variantId);
    const line = this.lines.at(index);
    line.controls.product.setValue(option?.product ?? null);
    if (option?.price && !line.controls.unit_price.value) {
      line.controls.unit_price.setValue(trimZeros(option.price));
    }
  }

  /** On a new order, picking a customer fills in their terms, currency and addresses. */
  onCustomerChange(customerId: number | null): void {
    if (this.isEdit || customerId === null) {
      return;
    }
    this.customersApi.detail(customerId).subscribe((customer) => {
      this.form.patchValue({ payment_terms: customer.payment_terms, currency: customer.currency || 'USD' });
      patchAddress(this.form.controls.billing_address, customer.billing_address);
      patchAddress(this.form.controls.shipping_address, customer.shipping_address);
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: SalesOrderPayload = {
      customer: value.customer as number,
      warehouse: value.warehouse as number,
      required_date: value.required_date || null,
      priority: value.priority,
      reference: value.reference.trim(),
      payment_terms: value.payment_terms.trim(),
      currency: value.currency.trim().toUpperCase(),
      discount_amount: value.discount_amount.trim() || '0',
      shipping_cost: value.shipping_cost.trim() || '0',
      shipping_address: toAddress(this.form.controls.shipping_address),
      billing_address: toAddress(this.form.controls.billing_address),
      notes: value.notes.trim(),
      internal_notes: value.internal_notes.trim(),
      lines: value.lines.map((line) => ({
        product: line.product as number,
        variant: line.variant,
        description: line.description.trim(),
        quantity_ordered: line.quantity_ordered.trim(),
        unit_price: line.unit_price.trim(),
        discount_percent: line.discount_percent.trim() || '0',
        tax_percent: line.tax_percent.trim() || '0',
        notes: line.notes.trim(),
      })),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, payload) : this.api.create(payload);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        void this.router.navigate(['/sales/orders', saved.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(this.id !== null ? ['/sales/orders', this.id] : ['/sales/orders']);
  }

  private loadOrder(id: number, variants: ProductVariant[]): void {
    this.api.detail(id).subscribe({
      next: (order) => {
        if (order.status !== 'draft') {
          this.notDraft.set(true);
          this.loading.set(false);
          return;
        }
        this.patchOrder(order, variants);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private patchOrder(order: SalesOrder, variants: ProductVariant[]): void {
    this.form.patchValue({
      customer: order.customer,
      warehouse: order.warehouse,
      required_date: order.required_date ?? '',
      priority: order.priority,
      reference: order.reference,
      payment_terms: order.payment_terms,
      currency: order.currency,
      discount_amount: trimZeros(order.discount_amount) || '0',
      shipping_cost: trimZeros(order.shipping_cost) || '0',
      notes: order.notes,
      internal_notes: order.internal_notes,
    });
    patchAddress(this.form.controls.billing_address, order.billing_address);
    patchAddress(this.form.controls.shipping_address, order.shipping_address);
    // Inactive items already on the order stay selectable.
    const known = new Set(this.items().map((item) => item.value));
    const missing = variants.filter((variant) => !known.has(variant.id) && order.lines.some((line) => line.variant === variant.id));
    this.items.update((items) => [...items, ...missing.map(toItemOption)]);
    order.lines.forEach((line) => this.addLine(line));
  }
}
