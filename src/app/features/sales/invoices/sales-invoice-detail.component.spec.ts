import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeInvoice, makePayment } from '../../../testing/sales-fixtures';
import { InvoicePayment, SalesInvoice } from '../sales.models';
import { SalesInvoiceDetailComponent } from './sales-invoice-detail.component';

const URL = '/api/sales/sales-invoices/';
const PAYMENTS = '/api/sales/invoice-payments/';

describe('SalesInvoiceDetailComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function flush(invoice: SalesInvoice, payments: InvoicePayment[] = []) {
    httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'GET').flush(envelope(invoice));
    httpMock.expectOne((r) => r.url === PAYMENTS && r.params.get('invoice') === '1').flush(envelope(payments));
  }

  function setup(overrides: Partial<SalesInvoice> = {}, payments: InvoicePayment[] = []) {
    TestBed.configureTestingModule({
      imports: [SalesInvoiceDetailComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = TestBed.createComponent(SalesInvoiceDetailComponent);
    fixture.detectChanges();
    flush(makeInvoice(overrides), payments);
    fixture.detectChanges();
    return fixture;
  }

  const labels = (fixture: ReturnType<typeof setup>) => fixture.componentInstance.actions().map((a) => a.label);
  const run = (fixture: ReturnType<typeof setup>, label: string) =>
    fixture.componentInstance.actions().find((a) => a.label === label)!.onClick();

  afterEach(() => httpMock.verify());

  it('shows lines, totals and amount due', () => {
    const text = setup().nativeElement.textContent;
    expect(text).toContain('INV-2026-00001');
    expect(text).toContain('287.00 SAR');
    expect(text).toContain('sales.hints.noPayments');
  });

  it('offers the actions each state allows', () => {
    expect(labels(setup())).toEqual(['sales.actions.editDetails', 'sales.actions.issueInvoice', 'common.delete', 'sales.actions.cancelInvoice']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'issued' }))).toEqual(['sales.actions.recordPayment', 'sales.actions.cancelInvoice']);
    TestBed.resetTestingModule();
    // A paid amount blocks cancelling (refund first).
    expect(labels(setup({ status: 'issued', amount_paid: '100.0000', amount_due: '187.0000' }))).toEqual(['sales.actions.recordPayment']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'paid', amount_paid: '287.0000', amount_due: '0.0000' }))).toEqual([]);
  });

  it('saves draft details and reloads', () => {
    const fixture = setup();
    run(fixture, 'sales.actions.editDetails');
    const component = fixture.componentInstance;
    expect(component.details.reference).toBe('PO-77');
    component.details.due_date = '2026-11-08';
    component.saveDetails();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body).toEqual({ due_date: '2026-11-08', reference: 'PO-77', payment_terms: 'Net 30', notes: '' });
    req.flush(envelope({ id: 1 }));
    flush(makeInvoice({ due_date: '2026-11-08' }));
  });

  it('issues a draft', () => {
    const fixture = setup();
    run(fixture, 'sales.actions.issueInvoice');
    httpMock.expectOne(`${URL}1/issue/`).flush(envelope(makeInvoice({ status: 'issued' })));
    expect(fixture.componentInstance.invoice()?.status).toBe('issued');
  });

  it('records a payment (defaulting to the amount due) and refuses more than is due', () => {
    const fixture = setup({ status: 'issued' });
    run(fixture, 'sales.actions.recordPayment');
    const component = fixture.componentInstance;
    expect(component.payment.amount).toBe('287.00');
    component.payment.amount = '300';
    component.savePayment();
    expect(component.dialogError()).toBe('sales.hints.paymentAmount');
    component.payment.amount = '100';
    component.payment.reference = ' TRX-1 ';
    component.savePayment();
    const req = httpMock.expectOne(`${URL}1/pay/`);
    expect(req.request.body).toEqual(jasmine.objectContaining({ amount: '100', payment_method: 'bank_transfer', reference: 'TRX-1' }));
    req.flush(envelope(makeInvoice({ status: 'issued', payment_status: 'partial', amount_paid: '100.0000', amount_due: '187.0000' })));
    httpMock.expectOne((r) => r.url === PAYMENTS).flush(envelope([makePayment()]));
    expect(component.paymentDialogOpen()).toBeFalse();
    expect(component.payments().length).toBe(1);
  });

  it('keeps the payment dialog open when the backend refuses', () => {
    const fixture = setup({ status: 'issued' });
    run(fixture, 'sales.actions.recordPayment');
    fixture.componentInstance.savePayment();
    httpMock.expectOne(`${URL}1/pay/`).flush(errorEnvelope(400, 'Cannot pay invoice in paid status'), { status: 400, statusText: 'Bad Request' });
    expect(fixture.componentInstance.paymentDialogOpen()).toBeTrue();
    expect(fixture.componentInstance.saving()).toBeFalse();
  });

  it('refunds a completed payment and reloads', () => {
    const fixture = setup({ status: 'paid', amount_paid: '100.0000', amount_due: '0.0000' }, [makePayment()]);
    expect(fixture.componentInstance.canRefund(makePayment({ status: 'refunded' }))).toBeFalse();
    fixture.componentInstance.refund(makePayment());
    httpMock.expectOne(`${PAYMENTS}1/refund/`).flush(envelope(makePayment({ status: 'refunded' })));
    flush(makeInvoice({ status: 'issued' }), [makePayment({ status: 'refunded' })]);
  });

  it('deletes a draft and goes back to the list', () => {
    const fixture = setup();
    run(fixture, 'common.delete');
    httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'DELETE').flush(null, { status: 204, statusText: 'No Content' });
    expect(router.navigate).toHaveBeenCalledWith(['/sales/invoices']);
  });

  it('cancels with a reason', () => {
    const fixture = setup({ status: 'issued' });
    fixture.componentInstance.onCancelConfirmed('Duplicate');
    const req = httpMock.expectOne(`${URL}1/cancel/`);
    expect(req.request.body).toEqual({ reason: 'Duplicate' });
    req.flush(envelope(makeInvoice({ status: 'cancelled', cancelled_reason: 'Duplicate' })));
    expect(fixture.componentInstance.invoice()?.status).toBe('cancelled');
  });
});
