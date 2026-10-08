import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeProduct } from '../../../testing/inventory-fixtures';
import { ProductListComponent } from './product-list.component';

const URL = '/api/inventory/v1/product/';

describe('ProductListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProductListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(ProductListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function expectList(params: Record<string, string>, rows: unknown[], total = rows.length) {
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'GET');
    for (const [key, value] of Object.entries(params)) {
      expect(req.request.params.get(key)).withContext(key).toBe(value);
    }
    req.flush(envelope(rows, total));
  }

  it('loads the first page and shows type, category and brand', () => {
    const fixture = create();
    expectList({ page: '1', page_size: '10' }, [makeProduct()]);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Phone X');
    expect(text).toContain('inventory.productTypes.simple');
    expect(text).toContain('Phones');
    expect(text).toContain('Acme');
  });

  it('sends paging and name ordering from the table', () => {
    const fixture = create();
    expectList({}, [makeProduct()], 30);
    fixture.componentInstance.table.onLazyLoad({ first: 20, rows: 10, sortField: 'name', sortOrder: -1 });
    expectList({ page: '3', page_size: '10', ordering: '-name' }, []);
  });

  it('debounces search and restarts from page 1', fakeAsync(() => {
    const fixture = create();
    expectList({}, [makeProduct()], 30);
    fixture.componentInstance.table.onLazyLoad({ first: 10, rows: 10 });
    expectList({ page: '2' }, []);
    fixture.componentInstance.table.onSearch('pho');
    tick(100);
    fixture.componentInstance.table.onSearch('phone ');
    tick(300);
    expectList({ page: '1', search: 'phone' }, [makeProduct()]);
  }));

  it('shows the forbidden state on 403 (no inventory module)', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page and deletes after confirmation', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    expectList({}, [makeProduct(), makeProduct({ id: 2 })]);
    fixture.componentInstance.edit(makeProduct());
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/products', 1, 'edit']);

    fixture.componentInstance.confirmDelete(makeProduct());
    httpMock.expectOne(`${URL}1/`).flush(null, { status: 204, statusText: 'No Content' });
    expectList({ page: '1' }, [makeProduct({ id: 2 })]);
  });
});
