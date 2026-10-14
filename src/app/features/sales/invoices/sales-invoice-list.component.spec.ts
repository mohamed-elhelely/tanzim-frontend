import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeInvoice } from '../../../testing/sales-fixtures';
import { SalesInvoiceListComponent } from './sales-invoice-list.component';

const URL = '/api/sales/sales-invoices/';

describe('SalesInvoiceListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SalesInvoiceListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('shows invoices with both statuses and the amount due (a number in the API)', () => {
    const fixture = TestBed.createComponent(SalesInvoiceListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeInvoice({ status: 'issued', amount_due: '187.0000' })], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('INV-2026-00001');
    expect(text).toContain('sales.invoiceStatuses.issued');
    expect(text).toContain('sales.paymentStatuses.pending');
    expect(text).toContain('187.00');
  });

  it('combines the status and payment filters', () => {
    const fixture = TestBed.createComponent(SalesInvoiceListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.status = ['issued', 'paid'];
    fixture.componentInstance.paymentStatus = ['partial'];
    fixture.componentInstance.dateFrom = '2026-10-01';
    fixture.componentInstance.dateTo = '2026-10-31';
    fixture.componentInstance.table.apply();
    httpMock
      .expectOne(
        (r) =>
          r.url === URL &&
          r.params.get('status') === 'issued,paid' &&
          r.params.get('payment_status') === 'partial' &&
          r.params.get('date_from') === '2026-10-01' &&
          r.params.get('date_to') === '2026-10-31',
      )
      .flush(envelope([], 0));
  });

  it('keeps the table and shows the reason when the backend refuses a filter', () => {
    const fixture = TestBed.createComponent(SalesInvoiceListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    const component = fixture.componentInstance;
    component.dateFrom = '2026-13-01';
    component.table.apply();
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('date_from') === '2026-13-01')
      .flush(errorEnvelope(400, 'Unknown error', { date_from: ['Enter a valid date.'] }), { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(component.table.error()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('Enter a valid date.');
    expect(fixture.nativeElement.textContent).toContain('common.dateFrom');
  });

  it('restores saved filters into its fields', () => {
    const fixture = TestBed.createComponent(SalesInvoiceListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    const component = fixture.componentInstance;
    component.table.applyQuery({ search: 'INV-9', filters: { status: 'issued,paid', payment_status: 'partial', date_from: '2026-10-01' } });
    expect(component.status).toEqual(['issued', 'paid']);
    expect(component.dateFrom).toBe('2026-10-01');
    expect(component.paymentStatus).toEqual(['partial']);
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('search') === 'INV-9' && r.params.get('payment_status') === 'partial')
      .flush(envelope([], 0));
  });

  it('issues only the ticked draft invoices', () => {
    let accept: (() => void) | undefined;
    spyOn(TestBed.inject(ConfirmationService), 'confirm').and.callFake((c: Confirmation) => {
      accept = c.accept as () => void;
      return TestBed.inject(ConfirmationService);
    });
    const fixture = TestBed.createComponent(SalesInvoiceListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    const component = fixture.componentInstance;
    component.table.selection.set([makeInvoice({ id: 5 }), makeInvoice({ id: 6, status: 'issued' })]);
    component.issueSelected();
    accept?.();
    httpMock.expectOne((r) => r.url === `${URL}5/issue/` && r.method === 'POST').flush(envelope({ id: 5, status: 'issued' }));
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });

  it('opens an invoice', () => {
    const fixture = TestBed.createComponent(SalesInvoiceListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.open(makeInvoice({ id: 3 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/sales/invoices', 3]);
  });
});
