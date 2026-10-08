import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeSupplierProduct } from '../../../testing/inventory-fixtures';
import { SupplierProductFormComponent } from './supplier-product-form.component';

const URL = '/api/inventory/v1/supplier-product/';

describe('SupplierProductFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null, query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [SupplierProductFormComponent],
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
    const fixture = TestBed.createComponent(SupplierProductFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function flushDropdowns() {
    httpMock.expectOne((r) => r.url.endsWith('/supplier/') && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Gulf Supply' }]));
    httpMock.expectOne((r) => r.url.endsWith('/product-variant/') && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, sku: 'PX-1', name: 'Phone X Red' }]));
  }

  it('labels variants "SKU — name", requires a cost and sends the backend defaults', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    flushDropdowns();
    expect(component.variantOptions()).toEqual([{ value: 1, label: 'PX-1 — Phone X Red' }]);
    expect(component.form.controls.effective_from.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    component.form.patchValue({ supplier: 1, product_variant: 1 });
    component.submit();
    fixture.detectChanges();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.nativeElement.textContent).toContain('validation.required');

    component.form.patchValue({ unit_cost: '480', currency: 'sar', lead_time_days: '5', effective_from: '2026-10-01' });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({ unit_cost: '480', currency: 'SAR', min_order_qty: '1', max_order_qty: null, lead_time_days: 5, effective_to: null }),
    );
    req.flush(envelope(makeSupplierProduct()), { status: 201, statusText: 'Created' });
  });

  it('on edit, sends only supplier, variant, preferred and what the user changed', () => {
    const component = setup('1').componentInstance;
    flushDropdowns();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeSupplierProduct()));
    component.form.controls.unit_cost.setValue('470');
    component.form.controls.unit_cost.markAsDirty();
    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body).toEqual({ supplier: 1, product_variant: 1, unit_cost: '470', is_preferred: true });
    req.flush(envelope(makeSupplierProduct()));
  });
});
