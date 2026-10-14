import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeVariant } from '../../../testing/inventory-fixtures';
import { VariantLabelsPrintComponent } from './variant-labels-print.component';

const URL = '/api/inventory/v1/product-variant/';

describe('VariantLabelsPrintComponent', () => {
  let httpMock: HttpTestingController;

  function setup(ids: string) {
    TestBed.configureTestingModule({
      imports: [VariantLabelsPrintComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ ids }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(VariantLabelsPrintComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('prints a label with a barcode for each chosen variant, repeated by copies', () => {
    const fixture = setup('1,2');
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeVariant({ id: 1, barcode: '6281234567890' })));
    httpMock.expectOne(`${URL}2/`).flush(envelope(makeVariant({ id: 2, sku: 'PX-BLUE', barcode: '' })));
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.labels().length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('app-barcode svg').length).toBe(2);
    expect(component.code(component.variants()![0])).toBe('6281234567890');
    // No barcode on file: the SKU is printed instead.
    expect(component.code(component.variants()![1])).toBe('PX-BLUE');

    component.setCopies(3);
    expect(component.labels().length).toBe(6);
    component.setCopies(500);
    expect(component.copies()).toBe(100);
  });

  it('falls back to the SKU when the barcode is not printable as Code 128', () => {
    const fixture = setup('1');
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeVariant({ id: 1, barcode: 'باركود' })));
    const component = fixture.componentInstance;
    expect(component.code(component.variants()![0])).toBe('PX-RED-128');
  });

  it('asks for a selection when no ids are given', () => {
    const fixture = setup('');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('labels.none');
  });
});
