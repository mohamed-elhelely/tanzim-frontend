import { TestBed } from '@angular/core/testing';
import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeChart } from '../../../testing/accounting-fixtures';
import { ReportResult } from '../accounting.models';
import { ReportViewerComponent } from './report-viewer.component';

const BASE = '/api/accounting/v1/reports/';

const TRIAL: ReportResult = {
  report_type: 'trial_balance',
  columns: ['code', 'name', 'account_type', 'debit', 'credit'],
  rows: [{ account_id: 3, code: '1110', name: 'Bank', account_type: 'asset', debit: 987, credit: 600 }],
  summary: { start_date: null, end_date: null, total_debit: 987, total_credit: 600, is_balanced: true },
};

describe('ReportViewerComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ imports: [ReportViewerComponent], providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ReportViewerComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/accounting/v1/accounts/').flush(envelope(makeChart()));
    httpMock.expectOne('/api/sales/customers/').flush(envelope([]));
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/supplier/').flush(envelope([{ id: 1, name: 'S3' }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('runs the trial balance on open and shows rows, money and the summary (empty dates skipped)', () => {
    const fixture = setup();
    httpMock.expectOne(`${BASE}trial_balance/`).flush(envelope(TRIAL));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Bank');
    expect(text).toContain('987.00');
    expect(text).toContain('accounting.accountTypes.asset');
    expect(text).toContain('accounting.hints.balanced');
    expect(fixture.componentInstance.summary().map(([key]) => key)).toEqual(['total_debit', 'total_credit', 'is_balanced']);
  });

  it('sends only the parameters the report takes, and asks for the required account first', () => {
    const fixture = setup();
    httpMock.expectOne(`${BASE}trial_balance/`).flush(envelope(TRIAL));
    const component = fixture.componentInstance;
    component.params = { start_date: '2026-01-01', as_of_date: '2026-12-31' };
    component.onTypeChange('general_ledger');
    httpMock.expectNone((r) => r.url.startsWith(BASE));
    component.run();
    expect(component.missingParam()).toBe('account');
    component.params.account = 3;
    component.run();
    const req: TestRequest = httpMock.expectOne((r) => r.url === `${BASE}general_ledger/`);
    expect(req.request.params.keys().sort()).toEqual(['account', 'start_date']);
    req.flush(envelope({ ...TRIAL, report_type: 'general_ledger' }));
  });

  it('downloads the same report as Excel', () => {
    const fixture = setup();
    httpMock.expectOne(`${BASE}trial_balance/`).flush(envelope(TRIAL));
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(HTMLAnchorElement.prototype, 'click');
    fixture.componentInstance.exportXlsx();
    const req = httpMock.expectOne((r) => r.url === `${BASE}trial_balance/` && r.params.get('export') === 'xlsx');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });
});
