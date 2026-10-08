import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeSupplierProduct } from '../../../testing/inventory-fixtures';
import { SupplierProductListComponent } from './supplier-product-list.component';

const URL = '/api/inventory/v1/supplier-product/';

describe('SupplierProductListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SupplierProductListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('shows supplier, variant and product', () => {
    const fixture = TestBed.createComponent(SupplierProductListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeSupplierProduct()], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Gulf Supply');
    expect(text).toContain('PX-RED-128');
    expect(text).toContain('Phone X');
  });
});
