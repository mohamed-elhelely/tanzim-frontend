import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { ReportRunnerComponent } from './report-runner.component';

const RUN = '/api/reports/v1/run/';
const TYPES = [
  { report_type: 'sales_performance', name: 'Sales Performance', module: 'inventory' },
  { report_type: 'inventory_movement', name: 'Inventory Movement', module: 'inventory' },
  { report_type: 'inventory_valuation', name: 'Inventory Valuation', module: 'inventory' },
  { report_type: 'brand_new', name: 'Brand New', module: 'inventory' },
];

describe('ReportRunnerComponent', () => {
  let httpMock: HttpTestingController;

  function setup(report: string | null = null) {
    TestBed.configureTestingModule({
      imports: [ReportRunnerComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(report ? { report } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ReportRunnerComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/warehouse/').flush(envelope([]));
    httpMock.expectOne('/api/reports/v1/types/').flush(envelope(TYPES));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('groups the reports and runs the one from the link', () => {
    const fixture = setup('sales_performance');
    const component = fixture.componentInstance;
    expect(component.groups().map((group) => [group.key, group.items.map((item) => item.report_type)])).toEqual([
      ['inventory', ['inventory_movement', 'inventory_valuation']],
      ['sales', ['sales_performance']],
      ['other', ['brand_new']],
    ]);
    expect(component.fields()).toEqual(['start_date', 'end_date', 'period']);
    httpMock.expectOne(`${RUN}sales_performance/`).flush(
      envelope({
        report_type: 'sales_performance',
        columns: ['period', 'orders', 'revenue'],
        rows: [{ period: '2026-10-01', orders: 2, revenue: 995 }],
        summary: { revenue: 995, revenue_change_percent: null, trend: [{ period: '2026-10-01', spend: 1 }], by_decision: { restock: 2 } },
      }),
    );
    fixture.detectChanges();
    expect(component.summaryValues().map(([key]) => key)).toEqual(['revenue', 'revenue_change_percent']);
    expect(component.summaryTables().map((table) => [table.key, table.rows.length])).toEqual([
      ['trend', 1],
      ['by_decision', 1],
    ]);
    expect(fixture.nativeElement.textContent).toContain('995.00');
  });

  it('asks for the required dates before running inventory movement, then sends them', () => {
    const component = setup('inventory_movement').componentInstance;
    httpMock.expectNone((r) => r.url.startsWith(RUN));
    component.run();
    expect(component.missing()).toBe('start_date');
    component.params = { start_date: '2026-01-01', end_date: '2026-10-31', warehouse: 2 };
    component.run();
    httpMock
      .expectOne(`${RUN}inventory_movement/?start_date=2026-01-01&end_date=2026-10-31&warehouse=2`)
      .flush(envelope({ report_type: 'inventory_movement', columns: [], rows: [], summary: {} }));
    expect(component.missing()).toBeNull();
  });

  it('opens the first report when the link names none, and keeps the choice in the URL', () => {
    const component = setup().componentInstance;
    httpMock.expectOne(`${RUN}sales_performance/`).flush(envelope({ report_type: 'sales_performance', columns: [], rows: [], summary: {} }));
    component.onTypeChange('inventory_valuation');
    httpMock.expectOne(`${RUN}inventory_valuation/`).flush(envelope({ report_type: 'inventory_valuation', columns: [], rows: [], summary: {} }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { report: 'inventory_valuation' } }));
  });
});
