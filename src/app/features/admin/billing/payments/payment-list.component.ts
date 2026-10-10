import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../../core/errors/app-error';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../../shared/table/server-table';
import { errorTitleKey, handleSaveError } from '../../../../shared/utils/server-errors';
import { TenantCompanyService } from '../../companies/tenant-company.service';
import { MONEY, PAYMENT_SEVERITY, PlatformPayment, Severity } from '../platform-billing.models';
import { PlatformPaymentService } from '../platform-billing.service';

/** /admin/payments: payments of every company on platform invoices; completed ones can be refunded. */
@Component({
  selector: 'app-payment-list',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TextareaModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-list.component.html',
})
export class PaymentListComponent implements OnInit {
  private readonly api = inject(PlatformPaymentService);
  private readonly companiesApi = inject(TenantCompanyService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  company: number | null = null;

  readonly table = new ServerTable<PlatformPayment>((query) =>
    this.api.list({ ...query, filters: this.company !== null ? { company: this.company } : {} }),
  );
  readonly errorTitleKey = errorTitleKey;
  /** Keyed by string: table rows are untyped in the template. */
  readonly severity: Record<string, Severity> = PAYMENT_SEVERITY;
  readonly companyOptions = signal<Array<{ value: number; label: string }>>([]);

  /** The payment being refunded (dialog open while set). */
  readonly refunding = signal<PlatformPayment | null>(null);
  readonly refundSaving = signal(false);
  readonly refundErrors = signal<string[]>([]);
  readonly refundForm = inject(NonNullableFormBuilder).group({
    amount: ['', [Validators.required, Validators.pattern(MONEY)]],
    reason: [''],
  });

  ngOnInit(): void {
    this.companiesApi.all().subscribe({
      next: (companies) => this.companyOptions.set(companies.map((company) => ({ value: company.id, label: company.name }))),
      error: () => this.companyOptions.set([]),
    });
    this.table.load();
  }

  onFilterChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  canRefund(payment: PlatformPayment): boolean {
    return (payment.status === 'completed' || payment.status === 'partially_refunded') && Number(payment.net_amount) > 0;
  }

  openRefund(payment: PlatformPayment): void {
    this.refundErrors.set([]);
    this.refundForm.reset({ amount: payment.net_amount, reason: '' });
    this.refunding.set(payment);
  }

  saveRefund(): void {
    const payment = this.refunding();
    if (!payment || this.refundForm.invalid || this.refundSaving()) {
      this.refundForm.markAllAsTouched();
      return;
    }
    const value = this.refundForm.getRawValue();
    this.refundSaving.set(true);
    this.refundErrors.set([]);
    this.api.refund(payment.id, { amount: value.amount, ...(value.reason.trim() ? { reason: value.reason.trim() } : {}) }).subscribe({
      next: () => {
        this.refundSaving.set(false);
        this.refunding.set(null);
        this.notifications.success(this.translate.instant('admin.billing.payments.refunded'));
        this.table.load();
      },
      error: (error: AppError) => {
        this.refundSaving.set(false);
        this.refundErrors.set(handleSaveError(this.refundForm, error, this.notifications));
      },
    });
  }
}
