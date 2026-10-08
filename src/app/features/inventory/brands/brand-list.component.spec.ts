import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeBrand } from '../../../testing/inventory-fixtures';
import { BrandListComponent } from './brand-list.component';

const URL = '/api/inventory/v1/brand/';

describe('BrandListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [BrandListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('loads the first page and shows rows', () => {
    const fixture = TestBed.createComponent(BrandListComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makeBrand()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acme');
    expect(fixture.nativeElement.textContent).toContain('Gadgets');
  });

  it('opens the edit page', () => {
    const fixture = TestBed.createComponent(BrandListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.edit(makeBrand({ id: 4 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/inventory/brands', 4, 'edit']);
  });
});
