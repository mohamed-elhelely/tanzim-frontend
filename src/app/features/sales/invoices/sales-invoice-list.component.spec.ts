import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
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
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeInvoice({ status: 'issued', amount_due: 187 })], 1));
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
    fixture.componentInstance.status = 'issued';
    fixture.componentInstance.paymentStatus = 'partial';
    fixture.componentInstance.onFilterChange();
    httpMock.expectOne((r) => r.url === URL && r.params.get('status') === 'issued' && r.params.get('payment_status') === 'partial').flush(envelope([], 0));
  });

  it('opens an invoice', () => {
    const fixture = TestBed.createComponent(SalesInvoiceListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.open(makeInvoice({ id: 3 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/sales/invoices', 3]);
  });
});
