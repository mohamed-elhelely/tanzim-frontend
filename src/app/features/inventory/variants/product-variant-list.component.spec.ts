import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeProduct, makeVariant } from '../../../testing/inventory-fixtures';
import { ProductVariantListComponent } from './product-variant-list.component';

const URL = '/api/inventory/v1/product-variant/';

describe('ProductVariantListComponent', () => {
  let httpMock: HttpTestingController;
  const query = new BehaviorSubject(convertToParamMap({}));

  beforeEach(async () => {
    query.next(convertToParamMap({}));
    await TestBed.configureTestingModule({
      imports: [ProductVariantListComponent],
      providers: [...provideApiTesting(), { provide: ActivatedRoute, useValue: { queryParamMap: query } }],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('lists every variant with SKU, product and price', () => {
    const fixture = TestBed.createComponent(ProductVariantListComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.has('product')).toBeFalse();
    req.flush(envelope([makeVariant()], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('PX-RED-128');
    expect(text).toContain('Phone X');
    expect(text).toContain('799.9900');
  });

  it('filters by ?product, names the product, and reloads when the filter is cleared', () => {
    query.next(convertToParamMap({ product: '1' }));
    const fixture = TestBed.createComponent(ProductVariantListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('product') === '1').flush(envelope([makeVariant()], 1));
    httpMock.expectOne('/api/inventory/v1/product/1/').flush(envelope(makeProduct()));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('inventory.variants.filteredBy');

    query.next(convertToParamMap({}));
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && !r.params.has('product')).flush(envelope([], 0));
  });
});
