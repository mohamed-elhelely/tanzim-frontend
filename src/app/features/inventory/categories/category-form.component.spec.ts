import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCategory } from '../../../testing/inventory-fixtures';
import { CategoryFormComponent } from './category-form.component';

const URL = '/api/inventory/v1/category/';
const ELECTRONICS = makeCategory();
const PHONES = makeCategory({ id: 2, name: 'Phones', parent: ELECTRONICS });
const SMART = makeCategory({ id: 3, name: 'Smart', parent: PHONES });
const BOOKS = makeCategory({ id: 4, name: 'Books' });

describe('CategoryFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [CategoryFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CategoryFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function flushAll(rows = [ELECTRONICS, PHONES, SMART, BOOKS]) {
    httpMock.expectOne((r) => r.url === URL && r.params.get('page_size') === '100').flush(envelope(rows, rows.length));
  }

  it('creates a category with its parent and labels options with the full path', () => {
    const component = setup(null).componentInstance;
    flushAll();
    expect(component.parentOptions().map((o) => o.label)).toEqual(['Electronics', 'Electronics › Phones', 'Electronics › Phones › Smart', 'Books']);
    component.form.setValue({ name: ' Tablets ', parent: 1, description: '', is_active: true });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name: 'Tablets', parent: 1, description: '', is_active: true });
    req.flush(envelope(makeCategory({ id: 9 })), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/categories']);
  });

  it('leaves itself and its descendants out of the parent options', () => {
    const component = setup('2').componentInstance;
    flushAll();
    httpMock.expectOne(`${URL}2/`).flush(envelope(PHONES));
    expect(component.parentOptions().map((o) => o.value)).toEqual([1, 4]);
  });

  it('omits an unchanged name and parent on edit (the backend would call it a duplicate)', () => {
    const component = setup('2').componentInstance;
    flushAll();
    httpMock.expectOne(`${URL}2/`).flush(envelope(PHONES));
    component.form.patchValue({ description: 'Mobiles', is_active: false });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}2/` && r.method === 'PATCH');
    expect(req.request.body).toEqual({ description: 'Mobiles', is_active: false });
    req.flush(envelope(PHONES));
  });

  it('sends name and parent when either changes', () => {
    const component = setup('2').componentInstance;
    flushAll();
    httpMock.expectOne(`${URL}2/`).flush(envelope(PHONES));
    component.form.patchValue({ parent: 4 });
    component.submit();
    const req = httpMock.expectOne((r) => r.method === 'PATCH');
    expect(req.request.body).toEqual({ name: 'Phones', parent: 4, description: '', is_active: true });
    req.flush(envelope(PHONES));
  });
});
