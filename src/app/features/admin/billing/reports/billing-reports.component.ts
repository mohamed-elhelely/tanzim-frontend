import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../../core/errors/app-error';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../../shared/utils/server-errors';
import { AnalyticsChartComponent } from '../../../analytics/analytics-chart.component';
import { AnalyticsRow, ChartSpec } from '../../../analytics/analytics.models';
import { CustomerBalanceRow, INVOICE_SEVERITY, OutstandingInvoiceRow, RevenueRow, Severity } from '../platform-billing.models';
import { BillingReportService } from '../platform-billing.service';

const REVENUE_CHART: ChartSpec = { type: 'bar', category: 'period', series: ['total_paid', 'total_outstanding'], stacked: true };

/**
 * /admin/billing-reports: platform revenue by month for a year, outstanding invoices and balances per subscription.
 * ⚠️ Scoped to the caller's company until BACKEND_REQUESTS item 30 ships, so staff see empty reports until then.
 */
@Component({
  selector: 'app-billing-reports',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    CardModule,
    SelectModule,
    TableModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
    AnalyticsChartComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './billing-reports.component.html',
})
export class BillingReportsComponent implements OnInit {
  private readonly api = inject(BillingReportService);

  readonly errorTitleKey = errorTitleKey;
  /** Keyed by string: table rows are untyped in the template. */
  readonly severity: Record<string, Severity> = INVOICE_SEVERITY;
  readonly chartSpec = REVENUE_CHART;
  readonly yearOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => ({ value: year, label: String(year) }));
  year = new Date().getFullYear();

  readonly revenue = signal<RevenueRow[] | null>(null);
  readonly revenueError = signal<AppError | null>(null);
  readonly outstanding = signal<OutstandingInvoiceRow[] | null>(null);
  readonly outstandingError = signal<AppError | null>(null);
  readonly balances = signal<CustomerBalanceRow[] | null>(null);
  readonly balancesError = signal<AppError | null>(null);

  /** The year's totals for the tiles above the chart. */
  readonly totals = computed(() => {
    const rows = this.revenue() ?? [];
    const sum = (field: 'total_invoiced' | 'total_paid' | 'total_outstanding') => rows.reduce((total, row) => total + Number(row[field] || 0), 0);
    return {
      invoiced: sum('total_invoiced'),
      paid: sum('total_paid'),
      outstanding: sum('total_outstanding'),
      invoices: rows.reduce((total, row) => total + (row.invoice_count || 0), 0),
    };
  });
  readonly chartRows = computed(() => (this.revenue() ?? []) as unknown as AnalyticsRow[]);

  ngOnInit(): void {
    this.loadRevenue();
    this.api.outstanding().subscribe({
      next: (rows) => this.outstanding.set(rows),
      error: (error: AppError) => this.outstandingError.set(error),
    });
    this.api.balances().subscribe({
      next: (rows) => this.balances.set(rows),
      error: (error: AppError) => this.balancesError.set(error),
    });
  }

  loadRevenue(): void {
    this.revenue.set(null);
    this.revenueError.set(null);
    this.api.revenue(this.year).subscribe({
      next: (rows) => this.revenue.set(rows),
      error: (error: AppError) => this.revenueError.set(error),
    });
  }
}
