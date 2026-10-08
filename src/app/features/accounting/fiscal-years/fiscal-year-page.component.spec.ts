import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeYear } from '../../../testing/accounting-fixtures';
import { FiscalYearPageComponent } from './fiscal-year-page.component';

const URL = '/api/accounting/v1/fiscal-years/';

describe('FiscalYearPageComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ imports: [FiscalYearPageComponent], providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = TestBed.createComponent(FiscalYearPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(URL).flush(envelope([makeYear()]));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('shows years with their periods', () => {
    const text = setup().nativeElement.textContent;
    expect(text).toContain('FY2026');
    expect(text).toContain('Jan 2026');
    expect(text).toContain('accounting.periodStatuses.closed');
  });

  it('suggests the year after the latest and creates it', () => {
    const component = setup().componentInstance;
    component.headerActions[0].onClick();
    expect(component.newYear).toEqual({ name: 'FY2027', start_date: '2027-01-01', end_date: '2027-12-31' });
    component.newYear.end_date = '2026-12-31';
    component.createYear();
    expect(component.dialogError()).toBe('accounting.hints.yearDates');
    component.newYear.end_date = '2027-12-31';
    component.createYear();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name: 'FY2027', start_date: '2027-01-01', end_date: '2027-12-31' });
    req.flush(envelope(makeYear({ id: 2, name: 'FY2027' })), { status: 201, statusText: 'Created' });
    httpMock.expectOne(URL).flush(envelope([makeYear()]));
  });

  it('closes an open period and reopens a closed one', () => {
    const component = setup().componentInstance;
    const [open, closed] = makeYear().periods;
    component.togglePeriod(open);
    httpMock.expectOne('/api/accounting/v1/fiscal-periods/1/close/').flush(envelope({ ...open, status: 'closed' }));
    httpMock.expectOne(URL).flush(envelope([makeYear()]));
    component.togglePeriod(closed);
    httpMock.expectOne('/api/accounting/v1/fiscal-periods/2/reopen/').flush(envelope({ ...closed, status: 'open' }));
    httpMock.expectOne(URL).flush(envelope([makeYear()]));
  });

  it("keeps the page when the backend refuses to close the year early", () => {
    const component = setup().componentInstance;
    component.closeYear(makeYear());
    httpMock.expectOne(`${URL}1/close/`).flush(errorEnvelope(400, 'FY2026 cannot be closed before it ends'), { status: 400, statusText: 'Bad Request' });
    expect(component.years().length).toBe(1);
  });
});
