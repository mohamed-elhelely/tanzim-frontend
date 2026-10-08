import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCategory } from '../../../testing/inventory-fixtures';
import { CategoryListComponent } from './category-list.component';

const URL = '/api/inventory/v1/category/';

describe('CategoryListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CategoryListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('loads the first page and shows rows', () => {
    const fixture = TestBed.createComponent(CategoryListComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makeCategory({ name: 'Phones', parent: makeCategory() })], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Phones');
    expect(fixture.nativeElement.textContent).toContain('Electronics');
  });

  it('opens the edit page', () => {
    const fixture = TestBed.createComponent(CategoryListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.edit(makeCategory({ id: 4 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/inventory/categories', 4, 'edit']);
  });
});
