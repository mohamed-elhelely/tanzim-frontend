import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { saveFile } from '../../../shared/utils/save-file';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { CodedRef, VALUATION_REPORT_METHODS } from '../../inventory/inventory.models';
import { WarehouseService } from '../../inventory/warehouses/warehouse.service';
import { AnalyticsLabelPipe, formatValue } from '../analytics-format';
import { AnalyticsTableComponent } from '../analytics-table.component';
import { AnalyticsService } from '../analytics.service';
import {
  AnalyticsRow,
  AnalyticsValue,
  REPORT_GROUPS,
  REPORT_GROUP_ORDER,
  REPORT_PARAMS,
  REQUIRED_PARAMS,
  ReportParam,
  ReportResult,
  ReportType,
} from '../analytics.models';

interface ReportGroup {
  key: string;
  items: ReportType[];
}

/**
 * Every report the company can run (GET reports/v1/types/), grouped by area. Each report shows only the inputs it
 * takes (REPORT_PARAMS); the result is the summary (single values as cards, nested lists as small tables) and the
 * rows in report order, or the same report as Excel. The chosen report is kept in `?report=` for links.
 */
@Component({
  selector: 'app-report-runner',
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    PageHeaderComponent,
    ErrorStateComponent,
    AnalyticsTableComponent,
    AnalyticsLabelPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-runner.component.html',
})
export class ReportRunnerComponent implements OnInit {
  private readonly api = inject(AnalyticsService);
  private readonly warehousesApi = inject(WarehouseService);
  private readonly notifications = inject(NotificationService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly types = signal<ReportType[]>([]);
  readonly type = signal<string | null>(null);
  params: Partial<Record<ReportParam, string | number | null>> = {};
  readonly result = signal<ReportResult | null>(null);
  readonly running = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly missing = signal<ReportParam | null>(null);
  readonly warehouseOptions = signal<{ value: number; label: string }[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly periodOptions = ['day', 'week', 'month'].map((period) => ({ value: period, label: `analytics.periods.${period}` }));
  readonly methodOptions = VALUATION_REPORT_METHODS.map((method) => ({ value: method, label: `inventory.valuationMethods.${method}` }));

  readonly groups = computed<ReportGroup[]>(() => {
    const order: string[] = [...REPORT_GROUP_ORDER, 'other'];
    const groups = new Map<string, ReportType[]>();
    for (const type of this.types()) {
      const group = REPORT_GROUPS[type.report_type] ?? 'other';
      groups.set(group, [...(groups.get(group) ?? []), type]);
    }
    return order.filter((key) => groups.has(key)).map((key) => ({ key, items: groups.get(key) ?? [] }));
  });
  readonly fields = computed<ReportParam[]>(() => REPORT_PARAMS[this.type() ?? ''] ?? []);
  /** Single summary values as cards; lists of rows become their own small tables. */
  readonly summaryValues = computed(() =>
    Object.entries(this.result()?.summary ?? {}).filter(([, value]) => !this.isRowList(value) && !(value !== null && typeof value === 'object' && !Array.isArray(value))),
  );
  readonly summaryTables = computed(() =>
    Object.entries(this.result()?.summary ?? {})
      .filter(([, value]) => this.isRowList(value) || (value !== null && typeof value === 'object' && !Array.isArray(value)))
      .map(([key, value]) => ({ key, rows: this.toRows(value) })),
  );

  ngOnInit(): void {
    this.warehousesApi.dropdown<CodedRef>().subscribe({
      next: (items) => this.warehouseOptions.set(items.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }))),
      error: () => undefined,
    });
    this.api.reportTypes().subscribe({
      next: (types) => {
        this.types.set(types);
        const wanted = this.route.snapshot.queryParamMap.get('report');
        const initial = types.find((type) => type.report_type === wanted) ?? types[0];
        if (initial) {
          this.onTypeChange(initial.report_type);
        }
      },
      error: (error: AppError) => this.error.set(error),
    });
  }

  onTypeChange(type: string): void {
    this.type.set(type);
    this.result.set(null);
    this.error.set(null);
    this.missing.set(null);
    void this.router.navigate([], { relativeTo: this.route, queryParams: { report: type }, replaceUrl: true });
    if (!this.requiredMissing()) {
      this.run();
    }
  }

  run(): void {
    const type = this.type();
    const missing = this.requiredMissing();
    this.missing.set(missing);
    if (!type || missing) {
      return;
    }
    this.running.set(true);
    this.error.set(null);
    this.api.run(type, this.query()).subscribe({
      next: (result) => {
        this.result.set(result);
        this.running.set(false);
      },
      error: (error: AppError) => {
        this.result.set(null);
        this.error.set(error);
        this.running.set(false);
      },
    });
  }

  exportXlsx(): void {
    const type = this.type();
    const missing = this.requiredMissing();
    this.missing.set(missing);
    if (!type || missing) {
      return;
    }
    this.exporting.set(true);
    this.api.exportXlsx(type, this.query()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        saveFile(blob, `${type}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      error: (error: AppError) => {
        this.exporting.set(false);
        if (error.status >= 400 && error.status < 500) {
          this.notifications.error(error.message);
        }
      },
    });
  }

  format(key: string, value: AnalyticsValue): string {
    return formatValue(key, value);
  }

  private isRowList(value: AnalyticsValue): boolean {
    return Array.isArray(value) && value.some((item) => item !== null && typeof item === 'object');
  }

  /** A nested list of rows as is; a nested object (e.g. counts per decision) as key/value rows. */
  private toRows(value: AnalyticsValue): AnalyticsRow[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is AnalyticsRow => item !== null && typeof item === 'object' && !Array.isArray(item));
    }
    return Object.entries(value as Record<string, AnalyticsValue>).map(([label, amount]) => ({ label, value: amount }));
  }

  private requiredMissing(): ReportParam | null {
    const required = REQUIRED_PARAMS[this.type() ?? ''] ?? [];
    return required.find((param) => !this.params[param]) ?? null;
  }

  private query(): Record<string, string> {
    const query: Record<string, string> = {};
    for (const field of this.fields()) {
      const value = this.params[field];
      if (value !== null && value !== undefined && value !== '') {
        query[field] = String(value);
      }
    }
    return query;
  }
}
