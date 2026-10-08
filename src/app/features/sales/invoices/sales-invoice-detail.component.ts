import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReasonDialogComponent } from '../../../shared/components/reason-dialog/reason-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { InvoicePaymentService } from '../payments/invoice-payment.service';
import {
  INVOICE_STATUS_SEVERITY,
  InvoicePayment,
  PAYMENT_METHODS,
  PAYMENT_RECORD_SEVERITY,
  PAYMENT_STATUS_SEVERITY,
  PaymentMethod,
  SalesInvoice,
  SalesInvoiceStatus,
} from '../sales.models';
import { SalesInvoiceService } from './sales-invoice.service';

const PAYABLE: SalesInvoiceStatus[] = ['issued', 'overdue'];
const CANCELLABLE: SalesInvoiceStatus[] = ['draft', 'issued', 'overdue'];
const MONEY = /^\d+(\.\d{1,4})?$/;

/** Today as YYYY-MM-DD in the user's time zone (what <input type="date"> uses). */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/**
 * One invoice: lines, totals, payments and its workflow. Drafts can be edited (due date, reference, terms, notes),
 * issued or deleted; issued invoices take payments; any unpaid invoice can be cancelled. Payments can be refunded.
 */
@Component({
  selector: 'app-sales-invoice-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TextareaModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ReasonDialogComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-invoice-detail.component.html',
})
export class SalesInvoiceDetailComponent implements OnInit {
  private readonly api = inject(SalesInvoiceService);
  private readonly paymentsApi = inject(InvoicePaymentService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly invoice = signal<SalesInvoice | null>(null);
  readonly payments = signal<InvoicePayment[]>([]);
  readonly loadError = signal<AppError | null>(null);
  readonly detailsDialogOpen = signal(false);
  readonly paymentDialogOpen = signal(false);
  readonly cancelDialogOpen = signal(false);
  readonly saving = signal(false);
  readonly dialogError = signal<string | null>(null);
  details = { due_date: '', reference: '', payment_terms: '', notes: '' };
  payment = { amount: '', payment_method: 'bank_transfer' as PaymentMethod, payment_date: today(), reference: '', notes: '' };
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = INVOICE_STATUS_SEVERITY;
  readonly paymentStatusSeverity = PAYMENT_STATUS_SEVERITY;
  readonly methodOptions = PAYMENT_METHODS.map((method) => ({ value: method, label: `sales.paymentMethods.${method}` }));

  readonly actions = computed<PageHeaderAction[]>(() => {
    const invoice = this.invoice();
    if (!invoice) {
      return [];
    }
    const actions: PageHeaderAction[] = [];
    if (invoice.status === 'draft') {
      actions.push({ label: 'sales.actions.editDetails', icon: 'pi pi-pencil', severity: 'secondary', onClick: () => this.openDetails() });
      actions.push({ label: 'sales.actions.issueInvoice', icon: 'pi pi-send', onClick: () => this.issue() });
      actions.push({ label: 'common.delete', icon: 'pi pi-trash', severity: 'secondary', onClick: () => this.remove() });
    }
    if (PAYABLE.includes(invoice.status) && Number(invoice.amount_due) > 0) {
      actions.push({ label: 'sales.actions.recordPayment', icon: 'pi pi-wallet', onClick: () => this.openPayment() });
    }
    if (CANCELLABLE.includes(invoice.status) && Number(invoice.amount_paid) === 0) {
      actions.push({ label: 'sales.actions.cancelInvoice', icon: 'pi pi-times', severity: 'danger', onClick: () => this.cancelDialogOpen.set(true) });
    }
    return actions;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.api.detail(this.id).subscribe({
      next: (invoice) => this.invoice.set(invoice),
      error: (error: AppError) => this.loadError.set(error),
    });
    this.loadPayments();
  }

  goBack(): void {
    void this.router.navigate(['/sales/invoices']);
  }

  paymentSeverity(payment: InvoicePayment) {
    return PAYMENT_RECORD_SEVERITY[payment.status] ?? 'secondary';
  }

  canRefund(payment: InvoicePayment): boolean {
    return payment.status === 'completed' && this.invoice()?.status !== 'cancelled';
  }

  saveDetails(): void {
    this.saving.set(true);
    this.confirm.runAction(
      () =>
        this.api.update(this.id, {
          due_date: this.details.due_date || null,
          reference: this.details.reference.trim(),
          payment_terms: this.details.payment_terms.trim(),
          notes: this.details.notes.trim(),
        }),
      'common.saved',
      () => {
        this.saving.set(false);
        this.detailsDialogOpen.set(false);
        this.load();
      },
      () => this.saving.set(false),
    );
  }

  savePayment(): void {
    const amount = this.payment.amount.trim();
    const due = Number(this.invoice()?.amount_due ?? 0);
    if (!MONEY.test(amount) || Number(amount) <= 0 || Number(amount) > due) {
      this.dialogError.set('sales.hints.paymentAmount');
      return;
    }
    this.dialogError.set(null);
    this.saving.set(true);
    this.confirm.runAction(
      () =>
        this.api.pay(this.id, {
          amount,
          payment_method: this.payment.payment_method,
          payment_date: this.payment.payment_date || today(),
          reference: this.payment.reference.trim(),
          notes: this.payment.notes.trim(),
        }),
      'sales.toasts.paymentRecorded',
      (invoice) => {
        this.saving.set(false);
        this.paymentDialogOpen.set(false);
        this.invoice.set(invoice);
        this.loadPayments();
      },
      () => this.saving.set(false),
    );
  }

  refund(payment: InvoicePayment): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.refund',
      params: { amount: Number(payment.amount).toFixed(2) },
      accept: 'sales.actions.refund',
      success: 'sales.toasts.refunded',
      danger: true,
      run: () => this.paymentsApi.refund(payment.id),
      onDone: () => this.load(),
    });
  }

  onCancelConfirmed(reason: string): void {
    this.confirm.runAction(
      () => this.api.cancel(this.id, reason),
      'sales.toasts.invoiceCancelled',
      (invoice) => {
        this.cancelDialogOpen.set(false);
        this.invoice.set(invoice);
      },
    );
  }

  private loadPayments(): void {
    this.paymentsApi.all({ invoice: this.id }).subscribe({ next: (payments) => this.payments.set(payments), error: () => undefined });
  }

  private openDetails(): void {
    const invoice = this.invoice();
    this.details = {
      due_date: invoice?.due_date ?? '',
      reference: invoice?.reference ?? '',
      payment_terms: invoice?.payment_terms ?? '',
      notes: invoice?.notes ?? '',
    };
    this.detailsDialogOpen.set(true);
  }

  private openPayment(): void {
    const due = Number(this.invoice()?.amount_due ?? 0);
    this.payment = { amount: due.toFixed(2), payment_method: 'bank_transfer', payment_date: today(), reference: '', notes: '' };
    this.dialogError.set(null);
    this.paymentDialogOpen.set(true);
  }

  private issue(): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.issueInvoice',
      accept: 'sales.actions.issueInvoice',
      success: 'sales.toasts.invoiceIssued',
      run: () => this.api.issue(this.id),
      onDone: (invoice) => this.invoice.set(invoice),
    });
  }

  private remove(): void {
    const invoice = this.invoice();
    this.confirm.confirmDelete(invoice?.invoice_number ?? '', () => this.api.remove(this.id), () => this.goBack());
  }
}
