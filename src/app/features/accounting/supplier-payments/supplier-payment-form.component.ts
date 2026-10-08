import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { handleSaveError } from '../../../shared/utils/server-errors';
import { InventoryRef } from '../../inventory/inventory.models';
import { SupplierInvoiceRef, SupplierInvoiceService } from '../../inventory/supplier-invoices/supplier-invoice.service';
import { SupplierService } from '../../inventory/suppliers/supplier.service';
import { SUPPLIER_PAYMENT_METHODS, SupplierPaymentMethod, SupplierPaymentPayload } from '../accounting.models';
import { SupplierPaymentService } from './supplier-payment.service';

const MONEY = /^\d+(\.\d{1,2})?$/;

type AllocationForm = FormGroup<{ invoice: FormControl<number | null>; amount: FormControl<string> }>;

/** Today as YYYY-MM-DD in the user's time zone (what <input type="date"> uses). */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Record a payment to a supplier, optionally split across their invoices. ⚠️ Supplier invoices can't be filtered by
 * supplier and their read shape is partial (BACKEND_REQUESTS 2, 8), so the picker lists every invoice number and the
 * backend rejects an invoice of another supplier or more than its open balance.
 */
@Component({
  selector: 'app-supplier-payment-form',
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
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './supplier-payment-form.component.html',
})
export class SupplierPaymentFormComponent implements OnInit {
  private readonly api = inject(SupplierPaymentService);
  private readonly suppliersApi = inject(SupplierService);
  private readonly invoicesApi = inject(SupplierInvoiceService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly saving = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly suppliers = signal<InventoryRef[]>([]);
  readonly invoices = signal<SupplierInvoiceRef[]>([]);
  readonly methodOptions = SUPPLIER_PAYMENT_METHODS.map((method) => ({ value: method, label: `sales.paymentMethods.${method}` }));

  readonly form = this.fb.group({
    supplier: [null as number | null, Validators.required],
    payment_date: [today(), Validators.required],
    amount: ['', [Validators.required, Validators.pattern(MONEY)]],
    payment_method: ['bank_transfer' as SupplierPaymentMethod],
    reference: ['', [Validators.maxLength(100)]],
    notes: [''],
    allocations: this.fb.array<AllocationForm>([]),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly allocated = computed(() => (this.value().allocations ?? []).reduce((sum, row) => sum + (Number(row.amount) || 0), 0));
  readonly overAllocated = computed(() => this.allocated() > (Number(this.value().amount) || 0) + 1e-9);

  get allocations(): FormArray<AllocationForm> {
    return this.form.controls.allocations;
  }

  ngOnInit(): void {
    this.suppliersApi.dropdown<InventoryRef>().subscribe({ next: (suppliers) => this.suppliers.set(suppliers), error: () => undefined });
    this.invoicesApi.dropdown<SupplierInvoiceRef>().subscribe({ next: (invoices) => this.invoices.set(invoices), error: () => undefined });
  }

  addAllocation(): void {
    this.allocations.push(
      this.fb.group({
        invoice: this.fb.control<number | null>(null, Validators.required),
        amount: ['', [Validators.required, Validators.pattern(MONEY)]],
      }),
    );
  }

  removeAllocation(index: number): void {
    this.allocations.removeAt(index);
  }

  submit(): void {
    if (this.form.invalid || this.overAllocated() || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: SupplierPaymentPayload = {
      supplier: value.supplier as number,
      payment_date: value.payment_date,
      amount: value.amount.trim(),
      payment_method: value.payment_method,
      reference: value.reference.trim(),
      notes: value.notes.trim(),
      allocations: value.allocations.map((row) => ({ invoice: row.invoice as number, amount: row.amount.trim() })),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    this.api.create(payload).subscribe({
      next: (payment) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('accounting.toasts.paymentRecorded'));
        void this.router.navigate(['/accounting/supplier-payments', payment.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/accounting/supplier-payments']);
  }
}
