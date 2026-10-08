import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeOrder } from '../../../testing/sales-fixtures';
import { SalesOrderStatus } from '../sales.models';
import { SalesOrderDetailComponent } from './sales-order-detail.component';

const URL = '/api/sales/sales-orders/';

describe('SalesOrderDetailComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;

  function setup(status: SalesOrderStatus = 'draft') {
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
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeOrder({ status })));
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
    expect(labels(setup('confirmed'))).toEqual(['sales.actions.clone', 'sales.actions.cancelOrder']);
    TestBed.resetTestingModule();
    expect(labels(setup('shipped'))).toEqual(['sales.actions.markDelivered', 'sales.actions.clone']);
    TestBed.resetTestingModule();
    expect(labels(setup('delivered'))).toEqual(['sales.actions.clone']);
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
    fixture.componentInstance.cancelReason = '  Customer changed mind ';
    fixture.componentInstance.confirmCancel();
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
    httpMock.expectOne(`${URL}4/`).flush(envelope(makeOrder({ id: 4, order_number: 'SO-2026-00004' })));
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
