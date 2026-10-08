import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
import { InventoryRef } from '../../inventory/inventory.models';
import { SupplierInvoiceRef, SupplierInvoiceService } from '../../inventory/supplier-invoices/supplier-invoice.service';
import { SupplierService } from '../../inventory/suppliers/supplier.service';
import { SupplierReturnService } from '../../returns/supplier-returns/supplier-return.service';
import { SupplierReturnListItem } from '../../returns/returns.models';
import { DebitNote, DebitNotePayload } from '../accounting.models';
import { DebitNoteService } from './debit-note.service';

const MONEY = /^\d+(\.\d{1,2})?$/;

/** Today as YYYY-MM-DD in the user's time zone (what <input type="date"> uses). */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * Create or edit a draft debit note: supplier, optional supplier return (that supplier's) and invoice, date, amounts,
 * the supplier's reference and the reason. Issued notes open read-only on their detail page instead.
 */
@Component({
  selector: 'app-debit-note-form',
  imports: [
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
  templateUrl: './debit-note-form.component.html',
})
export class DebitNoteFormComponent implements OnInit {
  private readonly api = inject(DebitNoteService);
  private readonly suppliersApi = inject(SupplierService);
  private readonly returnsApi = inject(SupplierReturnService);
  private readonly invoicesApi = inject(SupplierInvoiceService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(this.isEdit);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly notDraft = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly suppliers = signal<InventoryRef[]>([]);
  readonly invoices = signal<SupplierInvoiceRef[]>([]);
  /** The chosen supplier's returns. */
  readonly returns = signal<SupplierReturnListItem[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    supplier: [null as number | null, Validators.required],
    supplier_return: [null as number | null],
    supplier_invoice: [null as number | null],
    date: [today(), Validators.required],
    subtotal: ['', [Validators.required, Validators.pattern(MONEY)]],
    tax_amount: ['0', [Validators.pattern(MONEY)]],
    supplier_reference: ['', [Validators.maxLength(100)]],
    reason: [''],
  });

  ngOnInit(): void {
    this.suppliersApi.dropdown<InventoryRef>().subscribe({ next: (suppliers) => this.suppliers.set(suppliers), error: () => undefined });
    this.invoicesApi.dropdown<SupplierInvoiceRef>().subscribe({ next: (invoices) => this.invoices.set(invoices), error: () => undefined });
    if (this.id !== null) {
      this.api.retrieve(this.id).subscribe({
        next: (note) => this.patch(note),
        error: (error: AppError) => {
          this.loadError.set(error);
          this.loading.set(false);
        },
      });
    }
  }

  onSupplierChange(supplierId: number | null): void {
    this.form.controls.supplier_return.setValue(null);
    this.loadReturns(supplierId);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: DebitNotePayload = {
      supplier: value.supplier as number,
      supplier_return: value.supplier_return,
      supplier_invoice: value.supplier_invoice,
      date: value.date,
      subtotal: value.subtotal.trim(),
      tax_amount: value.tax_amount.trim() || '0',
      supplier_reference: value.supplier_reference.trim(),
      reason: value.reason.trim(),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, payload) : this.api.create(payload);
    request.subscribe({
      next: (note) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        void this.router.navigate(['/accounting/debit-notes', note.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(this.id !== null ? ['/accounting/debit-notes', this.id] : ['/accounting/debit-notes']);
  }

  private patch(note: DebitNote): void {
    if (note.status !== 'draft') {
      this.notDraft.set(true);
      this.loading.set(false);
      return;
    }
    this.form.patchValue({
      supplier: note.supplier,
      supplier_return: note.supplier_return,
      supplier_invoice: note.supplier_invoice,
      date: note.date,
      subtotal: note.subtotal,
      tax_amount: note.tax_amount,
      supplier_reference: note.supplier_reference,
      reason: note.reason,
    });
    this.loadReturns(note.supplier);
    this.loading.set(false);
  }

  private loadReturns(supplierId: number | null): void {
    this.returns.set([]);
    if (supplierId !== null) {
      this.returnsApi.all({ supplier: supplierId }).subscribe({ next: (returns) => this.returns.set(returns), error: () => undefined });
    }
  }
}
