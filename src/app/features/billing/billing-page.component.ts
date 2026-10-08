import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { AppError } from '../../core/errors/app-error';
import { LanguageService } from '../../core/services/language.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { TimeAgoPipe } from '../../shared/pipes/time-ago.pipe';
import { errorTitleKey } from '../../shared/utils/server-errors';
import { CurrentSubscription, InvoiceStatus, PlatformInvoice, SubscriptionStatus } from './billing.models';
import { BillingService } from './billing.service';

type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

const SUBSCRIPTION_SEVERITY: Record<SubscriptionStatus, Severity> = {
  trial: 'info',
  active: 'success',
  past_due: 'warn',
  canceled: 'secondary',
  expired: 'danger',
};

const INVOICE_SEVERITY: Record<InvoiceStatus, Severity> = {
  draft: 'secondary',
  issued: 'info',
  partially_paid: 'warn',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'secondary',
};

/** The company's plan, modules and platform invoices (read-only). */
@Component({
  selector: 'app-billing-page',
  imports: [
    TranslatePipe,
    ButtonModule,
    DialogModule,
    TableModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    TimeAgoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing-page.component.html',
})
export class BillingPageComponent implements OnInit {
  private readonly api = inject(BillingService);

  readonly lang = inject(LanguageService).currentLang;
  /** undefined = loading, null = no subscription (404). */
  readonly subscription = signal<CurrentSubscription | null | undefined>(undefined);
  readonly subscriptionError = signal<AppError | null>(null);
  readonly invoices = signal<PlatformInvoice[]>([]);
  readonly invoicesLoading = signal(true);
  readonly invoicesError = signal<AppError | null>(null);
  /** The invoice shown in the details dialog. */
  readonly selected = signal<PlatformInvoice | null>(null);
  readonly errorTitleKey = errorTitleKey;

  ngOnInit(): void {
    this.api.currentSubscription().subscribe({
      next: (subscription) => this.subscription.set(subscription),
      error: (error: AppError) => (error.status === 404 ? this.subscription.set(null) : this.subscriptionError.set(error)),
    });
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.invoicesLoading.set(true);
    this.invoicesError.set(null);
    this.api.invoices().subscribe({
      next: (invoices) => {
        this.invoices.set(invoices);
        this.invoicesLoading.set(false);
      },
      error: (error: AppError) => {
        this.invoicesError.set(error);
        this.invoicesLoading.set(false);
      },
    });
  }

  subscriptionSeverity(status: SubscriptionStatus): Severity {
    return SUBSCRIPTION_SEVERITY[status] ?? 'secondary';
  }

  invoiceSeverity(status: InvoiceStatus): Severity {
    return INVOICE_SEVERITY[status] ?? 'secondary';
  }
}
