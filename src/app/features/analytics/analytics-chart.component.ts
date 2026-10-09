import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ChartModule } from 'primeng/chart';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { humanize } from './analytics-format';
import { AnalyticsRow, ChartSpec, isMoneyKey } from './analytics.models';

/** Series colours, readable on light and dark backgrounds (Tailwind indigo, emerald, amber, rose, sky, violet). */
const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6'];

/**
 * One dashboard chart (chart.js through PrimeNG's p-chart) drawn from report rows with a ChartSpec.
 * 🧠 Rebuilt when the theme or language changes: axis and legend colours follow dark mode, series and category
 * names are translated, and in Arabic the category axis runs right to left.
 */
@Component({
  selector: 'app-analytics-chart',
  imports: [ChartModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './analytics-chart.component.html',
})
export class AnalyticsChartComponent {
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService);
  private readonly theme = inject(ThemeService);

  private readonly specState = signal<ChartSpec>({ type: 'bar', category: '', series: [] });
  private readonly rowsState = signal<AnalyticsRow[]>([]);

  @Input({ required: true }) set spec(spec: ChartSpec) {
    this.specState.set(spec);
  }

  @Input({ required: true }) set rows(rows: AnalyticsRow[]) {
    this.rowsState.set(rows ?? []);
  }

  /** Read by screen readers (the chart is a canvas). */
  @Input() ariaLabel = '';

  readonly chartType = computed(() => this.specState().type);

  readonly data = computed(() => {
    this.lang.currentLang(); // labels are translated: rebuild on a language switch
    const spec = this.specState();
    const rows = this.rowsState();
    const labels = rows.map((row) => this.categoryLabel(spec, row));
    if (spec.type === 'doughnut') {
      const field = spec.series[0];
      return {
        labels,
        datasets: [{ label: this.label(field), data: rows.map((row) => Number(row[field]) || 0), backgroundColor: rows.map((_, i) => PALETTE[i % PALETTE.length]) }],
      };
    }
    return {
      labels,
      datasets: spec.series.map((field, i) => ({
        label: this.label(field),
        data: rows.map((row) => Number(row[field]) || 0),
        backgroundColor: PALETTE[i % PALETTE.length],
        borderColor: PALETTE[i % PALETTE.length],
        borderRadius: spec.type === 'bar' ? 4 : 0,
        tension: 0.3,
        fill: false,
      })),
    };
  });

  readonly options = computed(() => {
    const spec = this.specState();
    const dark = this.theme.theme() === 'dark';
    const rtl = this.lang.direction() === 'rtl';
    const text = dark ? '#d1d5db' : '#4b5563';
    const grid = dark ? '#374151' : '#e5e7eb';
    const money = spec.series.some((field) => isMoneyKey(field));
    const legend = { display: spec.series.length > 1 || spec.type === 'doughnut', rtl, labels: { color: text } };
    if (spec.type === 'doughnut') {
      return { maintainAspectRatio: false, plugins: { legend: { ...legend, position: 'bottom' }, tooltip: { rtl } } };
    }
    const valueAxis = {
      stacked: spec.stacked,
      ticks: { color: text, callback: (value: number | string) => (money ? Number(value).toLocaleString('en') : value) },
      grid: { color: grid },
      beginAtZero: true,
    };
    const categoryAxis = { stacked: spec.stacked, ticks: { color: text }, grid: { display: false } };
    // Horizontal bars put the categories on y; in Arabic the value axis then grows to the left.
    const scales = spec.horizontal
      ? { x: { ...valueAxis, reverse: rtl }, y: { ...categoryAxis, position: rtl ? 'right' : 'left' } }
      : { x: { ...categoryAxis, reverse: rtl }, y: { ...valueAxis, position: rtl ? 'right' : 'left' } };
    return {
      maintainAspectRatio: false,
      indexAxis: spec.horizontal ? 'y' : 'x',
      plugins: { legend, tooltip: { rtl } },
      scales,
    };
  });

  private label(field: string): string {
    const id = `analytics.labels.${field}`;
    const text = this.translate.instant(id);
    return text && text !== id ? text : humanize(field);
  }

  private categoryLabel(spec: ChartSpec, row: AnalyticsRow): string {
    if (spec.categoryKey) {
      const id = `${spec.categoryKey.prefix}.${row[spec.categoryKey.field]}`;
      const text = this.translate.instant(id);
      if (text && text !== id) {
        return text;
      }
    }
    return String(row[spec.category] ?? '');
  }
}
