import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
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
import { CodedRef } from '../../inventory/inventory.models';
import { ProductVariantService } from '../../inventory/variants/product-variant.service';
import { ItemOption, toItemOption } from '../../inventory/variants/variant-options';
import { WarehouseService } from '../../inventory/warehouses/warehouse.service';
import { CustomerService } from '../../sales/customers/customer.service';
import { SalesOrderService } from '../../sales/orders/sales-order.service';
import { CustomerListItem, SalesOrderListItem } from '../../sales/sales.models';
import {
  CustomerReturnLinePayload,
  CustomerReturnPayload,
  REFUND_METHODS,
  RETURN_REASONS,
  RefundMethod,
  ReturnReason,
} from '../returns.models';
import { CustomerReturnService } from './customer-return.service';

const QUANTITY = /^\d+(\.\d{1,3})?$/;

/** A shipped order line the customer can send back (at most what was shipped). */
interface OrderRow {
  lineId: number;
  product: number;
  name: string;
  sku: string | null;
  shipped: number;
  quantity: string;
  defect: string;
}

/** An item returned without an order. */
interface FreeRow {
  variant: number | null;
  quantity: string;
  defect: string;
}

/**
 * New customer return. With an order, the shipped lines are listed and the user enters how many come back;
 * without one, items are picked freely. Quantities are capped by what was shipped; the backend also subtracts
 * what earlier returns already requested and answers under the line if that is exceeded.
 */
@Component({
  selector: 'app-customer-return-form',
  imports: [
    DecimalPipe,
    FormsModule,
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
  templateUrl: './customer-return-form.component.html',
})
export class CustomerReturnFormComponent implements OnInit {
  private readonly api = inject(CustomerReturnService);
  private readonly customersApi = inject(CustomerService);
  private readonly ordersApi = inject(SalesOrderService);
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
  readonly customers = signal<CustomerListItem[]>([]);
  readonly warehouses = signal<CodedRef[]>([]);
  readonly items = signal<ItemOption[]>([]);
  /** The selected customer's orders that shipped something. */
  readonly orders = signal<SalesOrderListItem[]>([]);
  readonly orderRows = signal<OrderRow[]>([]);
  freeRows: FreeRow[] = [{ variant: null, quantity: '1', defect: '' }];
  readonly errorTitleKey = errorTitleKey;
  readonly reasonOptions = RETURN_REASONS.map((reason) => ({ value: reason, label: `returns.reasons.${reason}` }));
  readonly refundOptions = REFUND_METHODS.map((method) => ({ value: method, label: `returns.refundMethods.${method}` }));

  readonly customerOptions = computed(() =>
    this.customers().map((customer) => ({ value: customer.id, label: `${customer.name} (${customer.customer_number})` })),
  );
  readonly orderOptions = computed(() =>
    this.orders().map((order) => ({ value: order.id, label: `${order.order_number} · ${order.order_date}` })),
  );

  readonly form = inject(NonNullableFormBuilder).group({
    customer: [null as number | null, Validators.required],
    sales_order: [null as number | null],
    warehouse: [null as number | null, Validators.required],
    return_reason: ['defective' as ReturnReason, Validators.required],
    return_reason_note: [''],
    refund_method: [null as RefundMethod | null],
    notes: [''],
  });

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
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  onCustomerChange(customerId: number | null): void {
    this.form.controls.sales_order.setValue(null);
    this.orderRows.set([]);
    this.orders.set([]);
    if (customerId === null) {
      return;
    }
    this.ordersApi.all({ customer: customerId }).subscribe((orders) =>
      this.orders.set(orders.filter((order) => ['picking', 'shipped', 'delivered'].includes(order.status))),
    );
  }

  onOrderChange(orderId: number | null): void {
    this.orderRows.set([]);
    if (orderId === null) {
      return;
    }
    this.ordersApi.detail(orderId).subscribe((order) => {
      this.form.controls.warehouse.setValue(order.warehouse);
      this.orderRows.set(
        order.lines
          .filter((line) => Number(line.quantity_shipped) > 0)
          .map((line) => ({
            lineId: line.id,
            product: line.product,
            name: line.product_name,
            sku: line.sku,
            shipped: Number(line.quantity_shipped),
            quantity: '',
            defect: '',
          })),
      );
    });
  }

  addFreeRow(): void {
    this.freeRows = [...this.freeRows, { variant: null, quantity: '1', defect: '' }];
  }

  removeFreeRow(index: number): void {
    this.freeRows = this.freeRows.filter((_, i) => i !== index);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const lines = this.buildLines();
    if (lines === null) {
      return;
    }
    const value = this.form.getRawValue();
    const payload: CustomerReturnPayload = {
      sales_order: value.sales_order,
      customer: value.customer as number,
      warehouse: value.warehouse as number,
      return_reason: value.return_reason,
      return_reason_note: value.return_reason_note.trim(),
      refund_method: value.refund_method,
      notes: value.notes.trim(),
      lines,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    this.api.create(payload).subscribe({
      next: (created) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        void this.router.navigate(['/returns/customer', created.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/returns/customer']);
  }

  /** The lines to send, or null (with a message) when the entered quantities aren't valid. */
  private buildLines(): CustomerReturnLinePayload[] | null {
    let lines: CustomerReturnLinePayload[];
    let invalid: boolean;
    let message = 'returns.hints.lineQuantity';
    if (this.form.controls.sales_order.value !== null) {
      const rows = this.orderRows().filter((row) => row.quantity.trim() !== '');
      invalid = rows.some((row) => !QUANTITY.test(row.quantity.trim()) || Number(row.quantity) <= 0 || Number(row.quantity) > row.shipped);
      lines = rows.map((row) => ({
        sales_order_line: row.lineId,
        product: row.product,
        quantity_requested: row.quantity.trim(),
        defect_description: row.defect.trim(),
        notes: '',
      }));
    } else {
      message = 'returns.hints.freeLine';
      invalid = this.freeRows.some((row) => row.variant === null || !QUANTITY.test(row.quantity.trim()) || Number(row.quantity) <= 0);
      lines = this.freeRows.map((row) => ({
        sales_order_line: null,
        product: this.items().find((item) => item.value === row.variant)?.product as number,
        quantity_requested: row.quantity.trim(),
        defect_description: row.defect.trim(),
        notes: '',
      }));
    }
    if (invalid || lines.length === 0) {
      this.linesError.set(invalid ? message : 'returns.hints.atLeastOneLine');
      return null;
    }
    this.linesError.set(null);
    return lines;
  }
}
