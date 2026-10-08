import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makePayment } from '../../../testing/sales-fixtures';
import { PaymentListComponent } from './payment-list.component';

const URL = '/api/sales/invoice-payments/';

describe('PaymentListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [PaymentListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('lists payments, filters by method and opens the invoice', () => {
    const fixture = TestBed.createComponent(PaymentListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makePayment({ status: 'refunded' })], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('sales.paymentRecordStatuses.refunded');
    fixture.componentInstance.method = 'cash';
    fixture.componentInstance.onMethodChange();
    httpMock.expectOne((r) => r.url === URL && r.params.get('payment_method') === 'cash').flush(envelope([], 0));
    fixture.componentInstance.openInvoice(makePayment({ invoice: 9 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/sales/invoices', 9]);
  });
});
