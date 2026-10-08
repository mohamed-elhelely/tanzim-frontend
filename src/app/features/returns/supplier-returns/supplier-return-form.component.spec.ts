import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeProduct, makeVariant } from '../../../testing/inventory-fixtures';
import { SupplierReturnFormComponent } from './supplier-return-form.component';

const URL = '/api/returns/v1/supplier-returns/';

describe('SupplierReturnFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup() {
    TestBed.configureTestingModule({ imports: [SupplierReturnFormComponent], providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(SupplierReturnFormComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/supplier/' && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Gulf' }]));
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/warehouse/').flush(envelope([{ id: 1, name: 'Main', code: 'WH-01' }]));
    httpMock
      .expectOne((r) => r.url === '/api/inventory/v1/product-variant/')
      .flush(envelope([makeVariant({ id: 2, product: makeProduct({ id: 8 }), standard_cost: '500.0000' })], 1));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('defaults the cost from the item and creates the return', () => {
    const component = setup().componentInstance;
    component.form.patchValue({ supplier: 1, warehouse: 1, return_reason: ' Damaged batch ' });
    component.rows[0].variant = 2;
    component.onItemChange(component.rows[0]);
    expect(component.rows[0].unitCost).toBe('500');
    component.rows[0].quantity = '2';
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      supplier: 1,
      warehouse: 1,
      return_reason: 'Damaged batch',
      lines: [{ product: 8, quantity: '2', unit_cost: '500', notes: '' }],
    });
    req.flush(envelope({ id: 3 }), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/returns/supplier', 3]);
  });

  it('needs a product, a quantity and a cost on every line', () => {
    const component = setup().componentInstance;
    component.form.patchValue({ supplier: 1, warehouse: 1, return_reason: 'x' });
    component.submit();
    expect(component.linesError()).toBe('returns.hints.supplierLine');
    httpMock.expectNone((r) => r.method === 'POST');
  });
});
