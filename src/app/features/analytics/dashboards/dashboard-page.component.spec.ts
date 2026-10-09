import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { Dashboard } from '../analytics.models';
import { DashboardPageComponent } from './dashboard-page.component';

const BASE = '/api/reports/v1/dashboards/';

function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    dashboard: 'overview',
    title: 'Overview',
    start_date: '2026-09-10',
    end_date: '2026-10-09',
    kpis: [
      { key: 'revenue', label: 'Revenue', value: 400, unit: 'currency', previous: 200, change_percent: 100 },
      { key: 'gross_margin_percent', label: 'Gross margin', value: 60, unit: 'percent' },
      { key: 'days_sales_outstanding', label: 'DSO', value: 31, unit: 'days' },
      { key: 'turnover', label: 'Turnover', value: null, unit: 'ratio' },
    ],
    charts: {
      order_pipeline: [{ status: 'draft', label: 'Draft', orders: 1, value: 300 }],
      // Unknown chart: shown as a table.
      something_new: [{ name: 'x', amount: 1 }],
    },
    tables: { reorder: [] },
    alerts: [{ level: 'warning', message: 'Sales orders past their required date', count: 2 }],
    ...overrides,
  };
}

describe('DashboardPageComponent', () => {
  let httpMock: HttpTestingController;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function setup(name = 'overview') {
    params = new BehaviorSubject(convertToParamMap({ name }));
    TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [...provideApiTesting(), { provide: ActivatedRoute, useValue: { paramMap: params } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(BASE).flush(envelope([{ dashboard: 'overview', title: 'Overview' }, { dashboard: 'sales', title: 'Sales' }]));
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/warehouse/').flush(envelope([{ id: 1, name: 'Main', code: 'MAIN' }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('loads the dashboard and shows KPIs, alerts and charts', () => {
    const fixture = setup();
    httpMock.expectOne(`${BASE}overview/`).flush(envelope(makeDashboard()));
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.startDate).toBe('2026-09-10');
    const [revenue, margin, dso, turnover] = makeDashboard().kpis;
    expect(component.kpiValue(revenue)).toBe('400.00');
    expect(component.kpiValue(margin)).toBe('60.00%');
    expect(component.kpiValue(dso)).toBe('31');
    expect(component.kpiValue(turnover)).toBe('—');
    expect(component.hasChange(revenue)).toBeTrue();
    expect(component.hasChange(margin)).toBeFalse();
    expect(component.charts().map((chart) => [chart.name, chart.spec !== null])).toEqual([
      ['order_pipeline', true],
      ['something_new', false],
    ]);
    expect(fixture.nativeElement.textContent).toContain('Sales orders past their required date');
  });

  it('sends the window and, on overview/inventory, the warehouse', () => {
    const fixture = setup();
    httpMock.expectOne(`${BASE}overview/`).flush(envelope(makeDashboard()));
    const component = fixture.componentInstance;
    component.startDate = '2026-01-01';
    component.warehouse = 1;
    component.load();
    const req = httpMock.expectOne(`${BASE}overview/?start_date=2026-01-01&end_date=2026-10-09&warehouse=1`);
    req.flush(envelope(makeDashboard()));

    params.next(convertToParamMap({ name: 'sales' }));
    const sales = httpMock.expectOne((r) => r.url === `${BASE}sales/`);
    expect(sales.request.params.has('warehouse')).toBeFalse();
    sales.flush(envelope(makeDashboard({ dashboard: 'sales' })));
  });

  it('sends an unknown dashboard name to the overview', () => {
    setup('nope');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/analytics/dashboards/overview']);
  });

  it('shows the error (e.g. finance without accounting)', () => {
    const fixture = setup('overview');
    httpMock.expectOne(`${BASE}overview/`).flush(errorEnvelope(403, 'Module not enabled'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.componentInstance.error()?.status).toBe(403);
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });
});
