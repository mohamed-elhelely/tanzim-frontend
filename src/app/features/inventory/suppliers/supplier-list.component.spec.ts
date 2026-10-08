import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeSupplier } from '../../../testing/inventory-fixtures';
import { SupplierListComponent } from './supplier-list.component';

const URL = '/api/inventory/v1/supplier/';

describe('SupplierListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SupplierListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('loads the first page and shows rows', () => {
    const fixture = TestBed.createComponent(SupplierListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeSupplier()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Gulf Supply');
    expect(fixture.nativeElement.textContent).toContain('inventory.supplierTypes.distributor');
  });

  it('opens the edit page', () => {
    const fixture = TestBed.createComponent(SupplierListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.has('page')).flush(envelope([], 0));
    fixture.componentInstance.edit(makeSupplier({ id: 4 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/inventory/suppliers', 4, 'edit']);
  });
});
