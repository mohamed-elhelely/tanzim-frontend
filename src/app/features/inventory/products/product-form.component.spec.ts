import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeProduct } from '../../../testing/inventory-fixtures';
import { ProductFormComponent } from './product-form.component';

const URL = '/api/inventory/v1/product/';
const CATEGORIES = '/api/inventory/v1/category/';
const BRANDS = '/api/inventory/v1/brand/';

describe('ProductFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [ProductFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function flushDropdowns() {
    httpMock.expectOne((r) => r.url === CATEGORIES && r.params.get('dropdown') === 'true').flush(envelope([{ id: 2, name: 'Phones' }]));
    httpMock.expectOne((r) => r.url === BRANDS && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Acme' }]));
  }

  it('starts with the backend defaults and creates a product', () => {
    const component = setup(null).componentInstance;
    flushDropdowns();
    expect(component.categoryOptions()).toEqual([{ value: 2, label: 'Phones' }]);
    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({ product_type: 'simple', default_uom: 'each', valuation_method: 'average', is_active: true }));

    component.form.patchValue({ name: ' Phone X ', category: 2, brand: 1, shelf_life_days: '30' });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      name: 'Phone X',
      product_type: 'simple',
      category: 2,
      brand: 1,
      default_uom: 'each',
      valuation_method: 'average',
      description: '',
      is_batch_tracked: false,
      is_serial_tracked: false,
      has_expiry: false,
      // Ignored without an expiry date.
      shelf_life_days: null,
      is_active: true,
      is_purchasable: true,
      is_sellable: true,
    });
    req.flush(envelope(makeProduct()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/products']);
  });

  it('sends shelf life as a number when the product expires, and rejects a bad value', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    flushDropdowns();
    component.form.patchValue({ name: 'Milk', has_expiry: true, shelf_life_days: '0' });
    component.submit();
    fixture.detectChanges();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.nativeElement.textContent).toContain('inventory.hints.shelfLifeDays');

    component.form.patchValue({ shelf_life_days: '14' });
    component.submit();
    const req = httpMock.expectOne((r) => r.method === 'POST');
    expect(req.request.body.shelf_life_days).toBe(14);
    req.flush(envelope(makeProduct()), { status: 201, statusText: 'Created' });
  });

  it('loads the product in edit mode and saves with PATCH', () => {
    const component = setup('1').componentInstance;
    flushDropdowns();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeProduct({ has_expiry: true, shelf_life_days: 90 })));
    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({ category: 2, brand: 1, is_serial_tracked: true, shelf_life_days: '90' }));
    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body.shelf_life_days).toBe(90);
    req.flush(envelope(makeProduct()));
  });
});
