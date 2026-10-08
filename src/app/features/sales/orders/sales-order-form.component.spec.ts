import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeProduct, makeVariant } from '../../../testing/inventory-fixtures';
import { makeCustomer, makeCustomerListItem, makeOrder } from '../../../testing/sales-fixtures';
import { SalesOrderFormComponent } from './sales-order-form.component';

const URL = '/api/sales/sales-orders/';

describe('SalesOrderFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [SalesOrderFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(SalesOrderFormComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === '/api/sales/customers/' && !r.params.has('page'))
      .flush(envelope([makeCustomerListItem(), makeCustomerListItem({ id: 2, name: 'Old Co', is_active: false })]));
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/warehouse/' && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Main', code: 'WH-01' }]));
    httpMock
      .expectOne((r) => r.url === '/api/inventory/v1/product-variant/')
      .flush(envelope([makeVariant({ id: 1, product: makeProduct({ id: 5 }), standard_price: '799.9900' }), makeVariant({ id: 2, sku: 'OLD', is_active: false })], 2));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('starts with one line, hides inactive customers and items', () => {
    const component = setup(null).componentInstance;
    expect(component.lines.length).toBe(1);
    expect(component.customerOptions().map((o) => o.value)).toEqual([1]);
    expect(component.items().map((o) => o.value)).toEqual([1]);
  });

  it("fills the customer's terms and addresses, sets the product and default price from the item, and creates", () => {
    const component = setup(null).componentInstance;
    component.form.patchValue({ customer: 1, warehouse: 1 });
    component.onCustomerChange(1);
    httpMock.expectOne('/api/sales/customers/1/').flush(envelope(makeCustomer()));
    expect(component.form.controls.currency.value).toBe('SAR');
    expect(component.form.controls.shipping_address.controls.city.value).toBe('Jeddah');

    component.lines.at(0).patchValue({ variant: 1 });
    component.onItemChange(0, 1);
    expect(component.lines.at(0).controls.unit_price.value).toBe('799.99');
    component.lines.at(0).patchValue({ quantity_ordered: '2', unit_price: '100', discount_percent: '10', tax_percent: '15' });
    component.form.patchValue({ shipping_cost: '25' });
    expect(component.totals()).toEqual(jasmine.objectContaining({ subtotal: 180, tax: 27, total: 232 }));

    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({
        customer: 1,
        warehouse: 1,
        required_date: null,
        currency: 'SAR',
        shipping_cost: '25',
        lines: [
          { product: 5, variant: 1, description: '', quantity_ordered: '2', unit_price: '100', discount_percent: '10', tax_percent: '15', notes: '' },
        ],
      }),
    );
    req.flush(envelope({ id: 9, order_number: 'SO-2026-00009', status: 'draft' }), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/sales/orders', 9]);
  });

  it('needs at least one line and validates quantities and percentages', () => {
    const component = setup(null).componentInstance;
    component.lines.at(0).patchValue({ quantity_ordered: '0', discount_percent: '150' });
    expect(component.lines.at(0).controls.quantity_ordered.hasError('greaterThan')).toBeTrue();
    expect(component.lines.at(0).controls.discount_percent.hasError('max')).toBeTrue();
    component.removeLine(0);
    expect(component.form.controls.lines.hasError('required')).toBeTrue();
    component.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('on edit, loads the draft with its lines and PATCHes every line', () => {
    const component = setup('1').componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeOrder()));
    expect(component.lines.length).toBe(1);
    expect(component.lines.at(0).getRawValue()).toEqual(
      jasmine.objectContaining({ product: 1, variant: 1, quantity_ordered: '2', unit_price: '100', discount_percent: '10' }),
    );
    expect(component.form.controls.shipping_cost.value).toBe('25');
    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body.lines.length).toBe(1);
    req.flush(envelope({ id: 1, order_number: 'SO-2026-00001', status: 'draft' }));
    expect(router.navigate).toHaveBeenCalledWith(['/sales/orders', 1]);
  });

  it("refuses to edit an order that isn't a draft", () => {
    const fixture = setup('1');
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeOrder({ status: 'confirmed' })));
    fixture.detectChanges();
    expect(fixture.componentInstance.notDraft()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('sales.hints.onlyDraftEditable');
  });

  it('puts line errors from the server on the line (lines.0.unit_price)', () => {
    const component = setup('1').componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeOrder()));
    component.submit();
    httpMock
      .expectOne((r) => r.method === 'PATCH')
      .flush(errorEnvelope(400, 'Unknown error', { lines: [{ unit_price: ['Ensure this value is greater than or equal to 0.'] }] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    expect(component.lines.at(0).controls.unit_price.errors?.['serverError']).toContain('greater than or equal to 0');
  });
});
