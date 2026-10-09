import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDeliveryNote, makeInvoice, makeOrder, makeOrderLine } from '../../../testing/sales-fixtures';
import { SalesOrderStatus } from '../sales.models';
import { SalesOrderDetailComponent } from './sales-order-detail.component';

const URL = '/api/sales/sales-orders/';

describe('SalesOrderDetailComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  /** Answers the order and its related deliveries and invoices. */
  function flushOrder(id: number, order: ReturnType<typeof makeOrder>, invoices: ReturnType<typeof makeInvoice>[] = []) {
    httpMock.expectOne(`${URL}${id}/`).flush(envelope(order));
    httpMock.expectOne((r) => r.url === '/api/sales/delivery-notes/' && r.params.get('sales_order') === String(id)).flush(envelope([]));
    httpMock.expectOne((r) => r.url === '/api/sales/sales-invoices/' && r.params.get('sales_order') === String(id)).flush(envelope(invoices));
  }

  function setup(status: SalesOrderStatus = 'draft', invoices: ReturnType<typeof makeInvoice>[] = [], lines = [makeOrderLine()]) {
    params = new BehaviorSubject(convertToParamMap({ id: '1' }));
    TestBed.configureTestingModule({
      imports: [SalesOrderDetailComponent],
      providers: [...provideApiTesting(), { provide: ActivatedRoute, useValue: { paramMap: params } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    // Accept every confirmation straight away.
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = TestBed.createComponent(SalesOrderDetailComponent);
    fixture.detectChanges();
    flushOrder(1, makeOrder({ status, lines }), invoices);
    fixture.detectChanges();
    return fixture;
  }

  const labels = (fixture: ReturnType<typeof setup>) => fixture.componentInstance.actions().map((a) => a.label);
  const run = (fixture: ReturnType<typeof setup>, label: string) =>
    fixture.componentInstance.actions().find((a) => a.label === label)!.onClick();

  afterEach(() => httpMock.verify());

  it('shows the order with its lines and totals', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('SO-2026-00001');
    expect(text).toContain('Phone X');
    expect(text).toContain('180.00');
    expect(text).toContain('232.00 SAR');
    expect(text).toContain('King Fahd Rd 12 · Riyadh');
  });

  it('offers the actions each status allows', () => {
    expect(labels(setup('draft'))).toEqual(['common.edit', 'sales.actions.confirmOrder', 'sales.actions.clone', 'sales.actions.cancelOrder']);
    TestBed.resetTestingModule();
    expect(labels(setup('confirmed'))).toEqual(['sales.actions.ship', 'sales.actions.clone', 'sales.actions.cancelOrder']);
    TestBed.resetTestingModule();
    expect(labels(setup('shipped'))).toEqual(['sales.actions.markDelivered', 'sales.actions.clone']);
    TestBed.resetTestingModule();
    expect(labels(setup('delivered'))).toEqual(['sales.actions.createInvoice', 'sales.actions.clone']);
  });

  it("doesn't offer Ship once every line is shipped", () => {
    const fixture = setup('picking', [], [makeOrderLine({ quantity_shipped: '2.000' })]);
    expect(labels(fixture)).not.toContain('sales.actions.ship');
  });

  it("doesn't offer a second invoice while one isn't cancelled", () => {
    expect(labels(setup('delivered', [makeInvoice({ status: 'issued' })]))).not.toContain('sales.actions.createInvoice');
    TestBed.resetTestingModule();
    expect(labels(setup('delivered', [makeInvoice({ status: 'cancelled' })]))).toContain('sales.actions.createInvoice');
  });

  it('ships the entered quantities and opens the new delivery note', () => {
    const fixture = setup('confirmed', [], [makeOrderLine(), makeOrderLine({ id: 12, line_number: 2, quantity_ordered: '4.000', quantity_shipped: '1.000' })]);
    run(fixture, 'sales.actions.ship');
    const component = fixture.componentInstance;
    expect(component.shipRows.map((row) => [row.lineId, row.quantity])).toEqual([
      [11, '2'],
      [12, '3'],
    ]);
    component.shipRows[1].quantity = '5';
    component.submitShip();
    expect(component.shipError()).toBe('sales.hints.shipQuantity');
    component.shipRows[1].quantity = '0';
    component.carrier = ' Aramex ';
    component.submitShip();
    const req = httpMock.expectOne(`${URL}1/create_delivery/`);
    expect(req.request.body).toEqual({ lines: [{ line_id: 11, quantity: '2' }], carrier: 'Aramex', tracking_number: '' });
    req.flush(envelope(makeDeliveryNote({ id: 7 })));
    expect(router.navigate).toHaveBeenCalledWith(['/sales/deliveries', 7]);
  });

  it('asks for at least one quantity before shipping', () => {
    const fixture = setup('confirmed');
    run(fixture, 'sales.actions.ship');
    fixture.componentInstance.shipRows[0].quantity = '';
    fixture.componentInstance.submitShip();
    expect(fixture.componentInstance.shipError()).toBe('sales.hints.shipSomething');
    httpMock.expectNone(`${URL}1/create_delivery/`);
  });

  it('creates an invoice from a delivered order and opens it', () => {
    const fixture = setup('delivered');
    run(fixture, 'sales.actions.createInvoice');
    const req = httpMock.expectOne('/api/sales/sales-invoices/create_from_order/');
    expect(req.request.body).toEqual({ sales_order: 1 });
    req.flush(envelope(makeInvoice({ id: 3 })), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/sales/invoices', 3]);
  });

  it('confirms and shows the returned order', () => {
    const fixture = setup();
    run(fixture, 'sales.actions.confirmOrder');
    httpMock.expectOne((r) => r.url === `${URL}1/confirm/` && r.method === 'POST').flush(envelope(makeOrder({ status: 'confirmed' })));
    expect(fixture.componentInstance.order()?.status).toBe('confirmed');
  });

  it('keeps the order as it was when confirming fails (e.g. credit limit)', () => {
    const fixture = setup();
    run(fixture, 'sales.actions.confirmOrder');
    httpMock
      .expectOne(`${URL}1/confirm/`)
      .flush(errorEnvelope(400, "['Order exceeds customer credit limit']"), { status: 400, statusText: 'Bad Request' });
    expect(fixture.componentInstance.order()?.status).toBe('draft');
  });

  it('cancels with the reason from the dialog', () => {
    const fixture = setup('confirmed');
    run(fixture, 'sales.actions.cancelOrder');
    expect(fixture.componentInstance.cancelDialogOpen()).toBeTrue();
    fixture.componentInstance.onCancelConfirmed('Customer changed mind');
    const req = httpMock.expectOne(`${URL}1/cancel/`);
    expect(req.request.body).toEqual({ reason: 'Customer changed mind' });
    req.flush(envelope(makeOrder({ status: 'cancelled', cancelled_reason: 'Customer changed mind' })));
    expect(fixture.componentInstance.cancelDialogOpen()).toBeFalse();
  });

  it('opens the copy after cloning, and reloads when the route changes', () => {
    const fixture = setup('delivered');
    run(fixture, 'sales.actions.clone');
    httpMock.expectOne(`${URL}1/clone/`).flush(envelope(makeOrder({ id: 4, order_number: 'SO-2026-00004' })));
    expect(router.navigate).toHaveBeenCalledWith(['/sales/orders', 4]);
    params.next(convertToParamMap({ id: '4' }));
    flushOrder(4, makeOrder({ id: 4, order_number: 'SO-2026-00004' }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SO-2026-00004');
  });

  it('marks a shipped order delivered', () => {
    const fixture = setup('shipped');
    run(fixture, 'sales.actions.markDelivered');
    httpMock.expectOne(`${URL}1/mark_delivered/`).flush(envelope(makeOrder({ status: 'delivered' })));
    expect(fixture.componentInstance.order()?.status).toBe('delivered');
  });
});
