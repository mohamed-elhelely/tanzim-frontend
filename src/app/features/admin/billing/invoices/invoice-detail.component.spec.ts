import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../../testing/api-testing';
import { AdminInvoice } from '../platform-billing.models';
import { InvoiceDetailComponent } from './invoice-detail.component';

const URL = '/api/subscriptions/v1/invoices/5/';

function invoice(overrides: Partial<AdminInvoice> = {}): AdminInvoice {
  return {
    id: 5,
    invoice_number: 'INV-1-2026-000005',
    company_name: 'Acme',
    subscription: 2,
    status: 'draft',
    issue_date: '2026-10-10',
    due_date: '2026-11-09',
    paid_date: null,
    subtotal: '0.00',
    tax_rate: '0.00',
    tax_amount: '0.00',
    discount: '0.00',
    discount_type: 'fixed',
    total: '0.00',
    amount_paid: '0.00',
    amount_due: '0.00',
    payment_method: '',
    notes: '',
    items: [],
    items_count: 0,
    can_edit: true,
    can_cancel: true,
    can_add_payment: false,
    status_history: [],
    ...overrides,
  };
}

describe('InvoiceDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup(data: AdminInvoice) {
    TestBed.configureTestingModule({
      imports: [InvoiceDetailComponent],
      providers: [...provideApiTesting(), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '5' }) } } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(InvoiceDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope([{ id: 7, name: 'Inventory', code: 'inventory' }]));
    httpMock.expectOne(URL).flush(envelope(data));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('keeps Issue disabled until the draft has an item, then adds one', () => {
    const fixture = setup(invoice());
    const issue = fixture.componentInstance.actions().find((action) => action.label === 'admin.billing.invoices.issue');
    expect(issue?.disabled).toBeTrue();

    fixture.componentInstance.openItem('new');
    fixture.componentInstance.itemForm.setValue({ description: 'Seats', quantity: '3', unit_price: '10.00', module: 7 });
    fixture.componentInstance.saveItem();
    const req = httpMock.expectOne(`${URL}add_item/`);
    expect(req.request.body).toEqual({ description: 'Seats', quantity: 3, unit_price: '10.00', module: 7 });
    req.flush(
      envelope(invoice({ items: [{ id: 1, description: 'Seats', quantity: 3, unit_price: '10.00', amount: '30.00', module_name: 'Inventory' }] })),
    );
    expect(fixture.componentInstance.editingItem()).toBeNull();
    expect(fixture.componentInstance.actions().find((action) => action.label === 'admin.billing.invoices.issue')?.disabled).toBeFalse();
  });

  it('records a payment and shows a backend refusal under the amount', () => {
    const fixture = setup(invoice({ status: 'issued', can_edit: false, can_add_payment: true, amount_due: '30.00', total: '30.00' }));
    const labels = fixture.componentInstance.actions().map((action) => action.label);
    expect(labels).toEqual(['admin.billing.invoices.markPaid', 'admin.billing.invoices.addPayment', 'admin.billing.invoices.cancel']);

    fixture.componentInstance.openPayment();
    expect(fixture.componentInstance.paymentForm.getRawValue().amount).toBe('30.00');
    fixture.componentInstance.paymentForm.patchValue({ amount: '40.00' });
    fixture.componentInstance.savePayment();
    httpMock
      .expectOne(`${URL}add_payment/`)
      .flush(errorEnvelope(400, 'Invalid', { amount: ['Amount exceeds the amount due.'] }), { status: 400, statusText: 'Bad Request' });
    expect(fixture.componentInstance.paymentForm.controls.amount.errors?.['serverError']).toBe('Amount exceeds the amount due.');
    expect(fixture.componentInstance.paymentOpen()).toBeTrue();
  });
});
