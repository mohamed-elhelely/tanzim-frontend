import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCustomerReturn, makeReturnLine } from '../../../testing/returns-fixtures';
import { CustomerReturn } from '../returns.models';
import { CustomerReturnDetailComponent } from './customer-return-detail.component';

const URL = '/api/returns/v1/customer-returns/';

describe('CustomerReturnDetailComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(overrides: Partial<CustomerReturn> = {}) {
    TestBed.configureTestingModule({
      imports: [CustomerReturnDetailComponent],
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
    const fixture = TestBed.createComponent(CustomerReturnDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeCustomerReturn(overrides)));
    fixture.detectChanges();
    return fixture;
  }

  const labels = (fixture: ReturnType<typeof setup>) => fixture.componentInstance.actions().map((a) => a.label);
  const run = (fixture: ReturnType<typeof setup>, label: string) =>
    fixture.componentInstance.actions().find((a) => a.label === label)!.onClick();

  afterEach(() => httpMock.verify());

  it('offers the next step of the workflow', () => {
    expect(labels(setup())).toEqual(['returns.actions.approve', 'returns.actions.reject', 'common.delete']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'approved' }))).toEqual(['returns.actions.receive', 'returns.actions.reject']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'received' }))).toEqual(['returns.actions.inspect']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'inspected', total_items_accepted: '1.000' }))).toEqual([
      'returns.actions.close',
      'returns.actions.createReplacement',
    ]);
    TestBed.resetTestingModule();
    // A cash refund doesn't get a replacement order.
    expect(labels(setup({ status: 'closed', refund_method: 'refund', total_items_accepted: '1.000' }))).toEqual([]);
  });

  it('approves, keeping the order number the action response leaves out', () => {
    const fixture = setup({ sales_order: 3, sales_order_number: 'SO-2026-00003' });
    run(fixture, 'returns.actions.approve');
    const { sales_order_number: _omitted, ...response } = makeCustomerReturn({ status: 'approved', sales_order: 3 });
    httpMock.expectOne(`${URL}1/approve/`).flush(envelope(response));
    expect(fixture.componentInstance.rma()).toEqual(jasmine.objectContaining({ status: 'approved', sales_order_number: 'SO-2026-00003' }));
  });

  it('rejects with the reason entered', () => {
    const fixture = setup();
    run(fixture, 'returns.actions.reject');
    const component = fixture.componentInstance;
    expect(component.rejectDialogOpen()).toBeTrue();
    component.onRejectConfirmed('Outside the return window');
    const req = httpMock.expectOne(`${URL}1/reject/`);
    expect(req.request.body).toEqual({ reason: 'Outside the return window' });
    req.flush(envelope(makeCustomerReturn({ status: 'rejected', rejection_reason: 'Outside the return window', rejected_date: '2026-10-09T10:00:00Z' })));
    fixture.detectChanges();
    expect(component.rejectDialogOpen()).toBeFalse();
    expect(component.actions()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Outside the return window');
  });

  it('receives the entered quantities and shows the updated lines from the response', () => {
    const fixture = setup({ status: 'approved' });
    run(fixture, 'returns.actions.receive');
    const component = fixture.componentInstance;
    expect(component.receiveRows[0].quantity).toBe('1');
    component.receiveRows[0].quantity = '3';
    component.submitReceive();
    expect(component.dialogError()).toBe('returns.hints.receiveQuantity');
    component.receiveRows[0].quantity = '1';
    component.submitReceive();
    const req = httpMock.expectOne(`${URL}1/receive/`);
    expect(req.request.body).toEqual({ lines: [{ line_id: 1, quantity_received: '1' }] });
    req.flush(envelope(makeCustomerReturn({ status: 'received', lines: [makeReturnLine({ quantity_received: '1.000' })] })));
    expect(component.dialog()).toBeNull();
    expect(component.rma()?.lines[0].quantity_received).toBe('1.000');
  });

  it('inspects with a disposition and the matching restocking decision', () => {
    const fixture = setup({ status: 'received', lines: [makeReturnLine({ quantity_received: '1.000' })] });
    run(fixture, 'returns.actions.inspect');
    const component = fixture.componentInstance;
    expect(component.inspectRows[0]).toEqual(jasmine.objectContaining({ quantity: '1', condition: 'good', disposition: 'accept' }));
    component.inspectRows[0].disposition = 'reject';
    component.inspectRows[0].quantity = '0';
    component.submitInspect();
    const req = httpMock.expectOne(`${URL}1/inspect/`);
    expect(req.request.body.lines[0]).toEqual({
      line_id: 1,
      quantity_accepted: '0',
      condition: 'good',
      disposition: 'reject',
      restocking_decision: 'write_off',
      rejection_reason: 'Screen flickers',
      defect_description: 'Screen flickers',
    });
    req.flush(envelope(makeCustomerReturn({ status: 'inspected' })));
    expect(component.rma()?.status).toBe('inspected');
  });

  it('closes with the refund amount (defaulting to the accepted value)', () => {
    const fixture = setup({ status: 'inspected', total_return_value: '100.0000' });
    run(fixture, 'returns.actions.close');
    expect(fixture.componentInstance.refundAmount).toBe('100.00');
    fixture.componentInstance.submitClose();
    const req = httpMock.expectOne(`${URL}1/close/`);
    expect(req.request.body).toEqual({ refund_amount: '100.00' });
    req.flush(envelope(makeCustomerReturn({ status: 'closed' })));
    expect(fixture.componentInstance.rma()?.status).toBe('closed');
  });

  it('opens the replacement order after creating it', () => {
    const fixture = setup({ status: 'inspected', total_items_accepted: '1.000' });
    run(fixture, 'returns.actions.createReplacement');
    httpMock.expectOne(`${URL}1/create_replacement/`).flush(envelope({ replacement_order: 6, order_number: 'SO-2026-00006' }), {
      status: 201,
      statusText: 'Created',
    });
    expect(router.navigate).toHaveBeenCalledWith(['/sales/orders', 6]);
  });
});
