import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { CurrentSubscription, PlatformInvoice } from './billing.models';
import { BillingPageComponent } from './billing-page.component';

const SUB = '/api/subscriptions/subscriptions/current/';
const INVOICES = '/api/subscriptions/invoices/';

function subscription(): CurrentSubscription {
  return {
    id: 1,
    plan_name: 'Basic',
    status: 'active',
    start_date: '2026-10-08',
    end_date: '2027-10-08',
    trial_end_date: null,
    next_billing_date: '2026-11-07',
    billing_email: 'admin@testcompany.com',
    licensed_users: 10,
    auto_renew: true,
    modules: [{ id: 1, module: { id: 6, name: 'Locations', code: 'location', is_active: true }, is_active: true }],
    is_trial_active: false,
    days_remaining: 365,
  };
}

function invoice(): PlatformInvoice {
  return {
    id: 2,
    invoice_number: 'INV-1-2026-000002',
    status: 'partially_paid',
    issue_date: '2026-10-08',
    due_date: '2026-11-07',
    paid_date: null,
    subtotal: '350.00',
    tax_rate: '0',
    tax_amount: '0.00',
    discount: '0',
    discount_type: 'fixed',
    total: '350.00',
    amount_paid: '100.00',
    amount_due: '250.00',
    notes: '',
    items: [{ id: 1, description: 'Inventory module', quantity: 10, unit_price: '25.00', amount: '250.00', module_name: null }],
    status_history: [],
  };
}

describe('BillingPageComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BillingPageComponent], providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('shows the plan, modules and invoices, and opens an invoice', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(SUB).flush(envelope(subscription()));
    httpMock.expectOne(INVOICES).flush(envelope([invoice()]));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Basic');
    expect(text).toContain('Locations');
    expect(text).toContain('INV-1-2026-000002');
    expect(text).toContain('billing.invoiceStatus.partially_paid');

    fixture.componentInstance.selected.set(invoice());
    fixture.detectChanges();
    expect(document.body.textContent).toContain('Inventory module');
  });

  it('says so when the company has no subscription (404)', () => {
    const fixture = TestBed.createComponent(BillingPageComponent);
    fixture.detectChanges();
    httpMock.expectOne(SUB).flush(errorEnvelope(404, 'No active subscription found'), { status: 404, statusText: 'Not Found' });
    httpMock.expectOne(INVOICES).flush(envelope([]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('billing.noSubscription');
    expect(fixture.nativeElement.textContent).toContain('billing.noInvoices');
  });
});
