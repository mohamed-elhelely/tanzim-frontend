import { ChangeDetectionStrategy, Component, Input, computed, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { AnalyticsLabelPipe, formatValue } from './analytics-format';
import { AnalyticsRow, AnalyticsValue, isIdKey } from './analytics.models';

/**
 * Any report or dashboard rows as a table. Columns come from `columns` (the report's own order) or, when not given,
 * from the first row; id columns are hidden. Numbers are right-aligned and formatted by their key (formatValue);
 * `flags` lists are shown as badges.
 */
@Component({
  selector: 'app-analytics-table',
  imports: [TranslatePipe, TableModule, AnalyticsLabelPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics-table.component.html',
})
export class AnalyticsTableComponent {
  private readonly rowsState = signal<AnalyticsRow[]>([]);
  private readonly columnsState = signal<string[] | null>(null);

  @Input() set rows(rows: AnalyticsRow[] | null | undefined) {
    this.rowsState.set(rows ?? []);
  }

  @Input() set columns(columns: string[] | null | undefined) {
    this.columnsState.set(columns ?? null);
  }

  /** Paginate long reports; dashboard tables are short. */
  @Input() paginate = false;

  readonly data = this.rowsState.asReadonly();
  readonly shownColumns = computed(() => {
    const columns = this.columnsState() ?? Object.keys(this.rowsState()[0] ?? {});
    return columns.filter((column) => !isIdKey(column));
  });

  format(key: string, value: AnalyticsValue): string {
    return formatValue(key, value);
  }

  isNumber(value: AnalyticsValue): boolean {
    return typeof value === 'number';
  }

  /** `flags` come as a list or as comma-separated text ("inactive,overdue"); empty means none. */
  flags(value: AnalyticsValue): string[] {
    if (Array.isArray(value)) {
      return value.map(String);
    }
    return typeof value === 'string' ? value.split(',').map((flag) => flag.trim()).filter(Boolean) : [];
  }
}
