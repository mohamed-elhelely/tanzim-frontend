import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AppError } from '../../../core/errors/app-error';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { CodedRef } from '../../inventory/inventory.models';
import { WarehouseService } from '../../inventory/warehouses/warehouse.service';
import { AnalyticsChartComponent } from '../analytics-chart.component';
import { AnalyticsLabelPipe } from '../analytics-format';
import { AnalyticsTableComponent } from '../analytics-table.component';
import { AnalyticsService } from '../analytics.service';
import { CHART_SPECS, ChartSpec, DASHBOARD_NAMES, Dashboard, DashboardName, DashboardRef, Kpi, fitsSpec } from '../analytics.models';

/** Dashboards that can be narrowed to one warehouse. */
const WAREHOUSE_DASHBOARDS: DashboardName[] = ['overview', 'inventory'];

interface ChartBlock {
  name: string;
  rows: Dashboard['charts'][string];
  /** Null when the rows don't fit a known chart: shown as a table. */
  spec: ChartSpec | null;
}

/**
 * The role dashboards (/analytics/dashboards/:name): KPI cards with the change against the previous window, alerts,
 * charts and short tables, for a date window (default: the last 30 days) and, for overview/inventory, a warehouse.
 * Only the dashboards the API lists for this company are offered (finance needs the accounting module).
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    PageHeaderComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    AnalyticsChartComponent,
    AnalyticsTableComponent,
    AnalyticsLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent implements OnInit {
  private readonly api = inject(AnalyticsService);
  private readonly warehousesApi = inject(WarehouseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly available = signal<DashboardRef[]>([]);
  readonly name = signal<DashboardName>('overview');
  readonly dashboard = signal<Dashboard | null>(null);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly warehouseOptions = signal<{ value: number; label: string }[]>([]);
  readonly errorTitleKey = errorTitleKey;
  startDate = '';
  endDate = '';
  warehouse: number | null = null;

  readonly showWarehouse = computed(() => WAREHOUSE_DASHBOARDS.includes(this.name()));
  readonly charts = computed<ChartBlock[]>(() =>
    Object.entries(this.dashboard()?.charts ?? {}).map(([name, rows]) => {
      const spec = CHART_SPECS[name];
      return { name, rows, spec: fitsSpec(spec, rows) ? spec : null };
    }),
  );
  readonly tables = computed(() => Object.entries(this.dashboard()?.tables ?? {}).map(([name, rows]) => ({ name, rows })));

  ngOnInit(): void {
    this.api.dashboards().subscribe({ next: (items) => this.available.set(items), error: () => undefined });
    this.warehousesApi.dropdown<CodedRef>().subscribe({
      next: (items) => this.warehouseOptions.set(items.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))),
      error: () => undefined,
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const name = params.get('name') as DashboardName;
      if (!DASHBOARD_NAMES.includes(name)) {
        void this.router.navigate(['/analytics/dashboards/overview']);
        return;
      }
      this.name.set(name);
      this.load();
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.dashboard(this.name(), this.query()).subscribe({
      next: (dashboard) => {
        this.dashboard.set(dashboard);
        // Show the window the backend used (it defaults to the last 30 days).
        this.startDate = dashboard.start_date;
        this.endDate = dashboard.end_date;
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.dashboard.set(null);
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  /** "Up" is good for most KPIs; the badge only shows the direction and size of the change. */
  changeClass(kpi: Kpi): string {
    const change = kpi.change_percent ?? 0;
    if (change > 0) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    }
    if (change < 0) {
      return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
    }
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
  }

  /** The KPI value as text for its unit; days and ratios get their suffix in the template. */
  kpiValue(kpi: Kpi): string {
    if (kpi.value === null || kpi.value === undefined) {
      return '—';
    }
    const digits = kpi.unit === 'currency' || kpi.unit === 'percent' || kpi.unit === 'ratio' ? 2 : 0;
    const text = kpi.value.toLocaleString('en', { minimumFractionDigits: digits, maximumFractionDigits: kpi.unit === 'number' ? 2 : digits });
    return kpi.unit === 'percent' ? `${text}%` : kpi.unit === 'ratio' ? `${text}×` : text;
  }

  hasChange(kpi: Kpi): boolean {
    return kpi.change_percent !== undefined && kpi.change_percent !== null;
  }

  private query(): Record<string, string> {
    const query: Record<string, string> = {};
    if (this.startDate) {
      query['start_date'] = this.startDate;
    }
    if (this.endDate) {
      query['end_date'] = this.endDate;
    }
    if (this.warehouse !== null && this.showWarehouse()) {
      query['warehouse'] = String(this.warehouse);
    }
    return query;
  }
}
