import { TestBed } from '@angular/core/testing';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { provideApiTesting } from '../../testing/api-testing';
import { AnalyticsChartComponent } from './analytics-chart.component';
import { CHART_SPECS } from './analytics.models';

describe('AnalyticsChartComponent', () => {
  function create() {
    TestBed.configureTestingModule({ imports: [AnalyticsChartComponent], providers: provideApiTesting() });
    return TestBed.createComponent(AnalyticsChartComponent).componentInstance;
  }

  it('builds one dataset per series with the category labels', () => {
    const chart = create();
    chart.spec = CHART_SPECS['movement'];
    chart.rows = [
      { sku: 'A', inbound: 5, outbound: 2 },
      { sku: 'B', inbound: 1, outbound: 0 },
    ];
    const data = chart.data() as { labels: string[]; datasets: { label: string; data: number[] }[] };
    expect(data.labels).toEqual(['A', 'B']);
    expect(data.datasets.map((set) => set.data)).toEqual([
      [5, 1],
      [2, 0],
    ]);
    // Without loaded translations the series names fall back to readable keys.
    expect(data.datasets.map((set) => set.label)).toEqual(['Inbound', 'Outbound']);
  });

  it('translates categories by code when the spec says so, else keeps the label', () => {
    const chart = create();
    chart.spec = CHART_SPECS['order_pipeline'];
    chart.rows = [{ status: 'draft', label: 'Draft', value: 10 }];
    // No translations are loaded in tests, so the English label stays.
    expect((chart.data() as { labels: string[] }).labels).toEqual(['Draft']);
  });

  it('follows dark mode and Arabic in its options', () => {
    const chart = create();
    chart.spec = CHART_SPECS['top_customers'];
    chart.rows = [{ customer: 'Delta', revenue: 10 }];
    TestBed.inject(ThemeService).theme.set('dark');
    TestBed.inject(LanguageService).currentLang.set('ar');
    const options = chart.options() as { indexAxis: string; scales: { x: { reverse: boolean; ticks: { color: string } }; y: { position: string } } };
    expect(options.indexAxis).toBe('y');
    expect(options.scales.x.reverse).toBeTrue();
    expect(options.scales.y.position).toBe('right');
    expect(options.scales.x.ticks.color).toBe('#d1d5db');
  });
});
