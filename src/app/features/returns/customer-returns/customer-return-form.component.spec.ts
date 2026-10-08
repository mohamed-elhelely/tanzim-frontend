import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeProduct, makeVariant } from '../../../testing/inventory-fixtures';
import { makeCustomerListItem, makeOrder, makeOrderLine, makeOrderListItem } from '../../../testing/sales-fixtures';
import { CustomerReturnFormComponent } from './customer-return-form.component';

const URL = '/api/returns/v1/customer-returns/';

describe('CustomerReturnFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup() {
    TestBed.configureTestingModule({ imports: [CustomerReturnFormComponent], providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CustomerReturnFormComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/sales/customers/').flush(envelope([makeCustomerListItem()]));
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/warehouse/').flush(envelope([{ id: 1, name: 'Main', code: 'WH-01' }]));
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/product-variant/').flush(envelope([makeVariant({ id: 2, product: makeProduct({ id: 8 }) })], 1));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it("lists the customer's shipped orders, then the shipped lines of the picked one", () => {
    const component = setup().componentInstance;
    component.form.controls.customer.setValue(1);
    component.onCustomerChange(1);
    httpMock
      .expectOne((r) => r.url === '/api/sales/sales-orders/' && r.params.get('customer') === '1')
      .flush(envelope([makeOrderListItem({ status: 'delivered' }), makeOrderListItem({ id: 2, status: 'draft' })]));
    expect(component.orders().map((order) => order.id)).toEqual([1]);

    component.form.controls.sales_order.setValue(1);
    component.onOrderChange(1);
    httpMock
      .expectOne('/api/sales/sales-orders/1/')
      .flush(envelope(makeOrder({ warehouse: 3, lines: [makeOrderLine({ quantity_shipped: '2.000' }), makeOrderLine({ id: 12, quantity_shipped: '0.000' })] })));
    expect(component.form.controls.warehouse.value).toBe(3);
    expect(component.orderRows().map((row) => [row.lineId, row.shipped])).toEqual([[11, 2]]);
  });

  it('creates a return from an order, refusing more than was shipped', () => {
    const component = setup().componentInstance;
    component.form.patchValue({ customer: 1, warehouse: 1, sales_order: 1 });
    component.onOrderChange(1);
    httpMock.expectOne('/api/sales/sales-orders/1/').flush(envelope(makeOrder({ lines: [makeOrderLine({ quantity_shipped: '2.000' })] })));
    component.orderRows()[0].quantity = '3';
    component.submit();
    expect(component.linesError()).toBe('returns.hints.lineQuantity');
    httpMock.expectNone((r) => r.method === 'POST');

    component.orderRows()[0].quantity = '1';
    component.orderRows()[0].defect = ' Screen flickers ';
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({
        sales_order: 1,
        customer: 1,
        warehouse: 1,
        return_reason: 'defective',
        lines: [{ sales_order_line: 11, product: 1, quantity_requested: '1', defect_description: 'Screen flickers', notes: '' }],
      }),
    );
    req.flush(envelope({ id: 5 }), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/returns/customer', 5]);
  });

  it('creates a return without an order from picked items', () => {
    const component = setup().componentInstance;
    component.form.patchValue({ customer: 1, warehouse: 1 });
    component.submit();
    expect(component.linesError()).toBe('returns.hints.freeLine');
    component.freeRows[0].variant = 2;
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body.sales_order).toBeNull();
    expect(req.request.body.lines).toEqual([{ sales_order_line: null, product: 8, quantity_requested: '1', defect_description: '', notes: '' }]);
    req.flush(envelope({ id: 6 }), { status: 201, statusText: 'Created' });
  });
});
