import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { AdminInvoiceService, BillingReportService, PlatformPaymentService, SubscriptionService } from './platform-billing.service';

describe('Platform billing services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [...provideApiTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('drives the invoice workflow through its action endpoints', () => {
    const api = TestBed.inject(AdminInvoiceService);
    const calls: Array<[() => void, string, string, unknown]> = [
      [() => api.createDraft({ subscription: 2 }).subscribe(), 'POST', '/api/subscriptions/invoices/create_draft/', { subscription: 2 }],
      [() => api.addItem(5, { description: 'Seats', quantity: 3, unit_price: '10.00' }).subscribe(), 'POST', '/api/subscriptions/invoices/5/add_item/', { description: 'Seats', quantity: 3, unit_price: '10.00' }],
      [() => api.updateItem(5, 9, { quantity: 4 }).subscribe(), 'PATCH', '/api/subscriptions/invoices/5/items/9/', { quantity: 4 }],
      [() => api.removeItem(5, 9).subscribe(), 'DELETE', '/api/subscriptions/invoices/5/items/9/', null],
      [() => api.issue(5).subscribe(), 'POST', '/api/subscriptions/invoices/5/issue/', {}],
      [() => api.addPayment(5, { amount: '30.00' }).subscribe(), 'POST', '/api/subscriptions/invoices/5/add_payment/', { amount: '30.00' }],
      [() => api.markPaid(5).subscribe(), 'POST', '/api/subscriptions/invoices/5/mark_paid/', {}],
      [() => api.cancel(5, 'Duplicate').subscribe(), 'POST', '/api/subscriptions/invoices/5/cancel/', { reason: 'Duplicate' }],
    ];
    for (const [call, method, url, body] of calls) {
      call();
      const req = httpMock.expectOne(url);
      expect(req.request.method).toBe(method);
      expect(req.request.body).toEqual(body);
      req.flush(envelope({ id: 5 }));
    }
  });

  it('switches subscription modules by module_id', () => {
    const api = TestBed.inject(SubscriptionService);
    api.addModule(2, 7).subscribe();
    expect(httpMock.expectOne('/api/subscriptions/subscriptions/2/add_module/').request.body).toEqual({ module_id: 7 });
    api.removeModule(2, 7).subscribe();
    httpMock.expectOne('/api/subscriptions/subscriptions/2/remove_module/').flush(null, { status: 204, statusText: 'No Content' });
  });

  it('refunds a payment and reads the reports', () => {
    TestBed.inject(PlatformPaymentService).refund(1, { amount: '10.00', reason: 'Goodwill' }).subscribe();
    expect(httpMock.expectOne('/api/subscriptions/payments/1/refund/').request.body).toEqual({ amount: '10.00', reason: 'Goodwill' });

    const reports = TestBed.inject(BillingReportService);
    reports.revenue(2026).subscribe();
    httpMock.expectOne((r) => r.url === '/api/subscriptions/reports/revenue_summary/' && r.params.get('year') === '2026').flush(envelope([]));
    reports.outstanding().subscribe();
    httpMock.expectOne('/api/subscriptions/reports/outstanding_invoices/').flush(envelope([]));
    reports.balances().subscribe();
    httpMock.expectOne('/api/subscriptions/reports/customer_balances/').flush(envelope([]));
  });
});
