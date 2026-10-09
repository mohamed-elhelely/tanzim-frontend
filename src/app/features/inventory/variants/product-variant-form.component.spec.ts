import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeVariant } from '../../../testing/inventory-fixtures';
import { ProductVariantFormComponent } from './product-variant-form.component';

const URL = '/api/inventory/v1/product-variant/';
const PRODUCTS = '/api/inventory/v1/product/';

describe('ProductVariantFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null, query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [ProductVariantFormComponent],
      providers: [
        ...provideApiTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}), queryParamMap: convertToParamMap(query) } },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ProductVariantFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function flushProducts() {
    httpMock.expectOne((r) => r.url === PRODUCTS && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Phone X' }]));
  }

  it('preselects the product from ?product and sends attributes as an object', () => {
    const component = setup(null, { product: '1' }).componentInstance;
    flushProducts();
    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({ product: 1, weight_uom: 'kg' }));

    component.form.patchValue({ sku: ' PX-1 ', name: 'Phone X Red', standard_price: '799.99' });
    component.addAttribute(' color ', ' red ');
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      product: 1,
      sku: 'PX-1',
      name: 'Phone X Red',
      barcode: '',
      attributes: { color: 'red' },
      standard_cost: null,
      standard_price: '799.99',
      weight: null,
      weight_uom: 'kg',
      is_active: true,
    });
    req.flush(envelope(makeVariant()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/variants'], { queryParams: { product: 1 } });
  });

  it('rejects duplicate attribute names and a price with too many decimals', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    flushProducts();
    component.form.patchValue({ product: 1, sku: 'S', name: 'N', standard_price: '1.23456' });
    component.addAttribute('Color', 'red');
    component.addAttribute('color', 'blue');
    component.submit();
    fixture.detectChanges();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.nativeElement.textContent).toContain('inventory.hints.attributes');
    expect(fixture.nativeElement.textContent).toContain('inventory.hints.decimal4');
  });

  it('loads attributes into rows and the weight unit on edit', () => {
    const component = setup('1').componentInstance;
    flushProducts();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeVariant()));
    expect(component.attributes.getRawValue()).toEqual([
      { key: 'color', value: 'red' },
      { key: 'storage', value: '128GB' },
    ]);
    component.removeAttribute(1);
    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body.attributes).toEqual({ color: 'red' });
    expect(req.request.body.weight_uom).toBe('kg');
    req.flush(envelope(makeVariant()));
  });

  it('shows a duplicate SKU under the field', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    flushProducts();
    component.form.patchValue({ product: 1, sku: 'P1-1', name: 'N' });
    component.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Invalid', { sku: ['product variant with this sku already exists.'] }), { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('product variant with this sku already exists.');
  });
});
