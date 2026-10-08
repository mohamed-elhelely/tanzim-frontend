import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDepartment } from '../../../testing/company-fixtures';
import { DepartmentListComponent } from './department-list.component';

const URL = '/api/company/v1/departments/';

describe('DepartmentListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DepartmentListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(DepartmentListComponent);
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

  function acceptConfirmations() {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
  }

  it('loads the first page on start and shows rows', () => {
    const fixture = create();
    expectList({ page: '1', page_size: '10' }, [makeDepartment()]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sales');
  });

  it('sends paging and ordering from the table', () => {
    const fixture = create();
    expectList({}, [makeDepartment()], 30);
    fixture.componentInstance.table.onLazyLoad({ first: 20, rows: 10, sortField: 'name_en', sortOrder: -1 });
    expectList({ page: '3', page_size: '10', ordering: '-name_en' }, []);
  });

  it('debounces search and restarts from page 1', fakeAsync(() => {
    const fixture = create();
    expectList({}, [makeDepartment()], 30);
    fixture.componentInstance.table.onLazyLoad({ first: 10, rows: 10 });
    expectList({ page: '2' }, []);

    fixture.componentInstance.table.onSearch('sa');
    tick(100);
    fixture.componentInstance.table.onSearch('sales ');
    tick(300);

    expectList({ page: '1', search: 'sales' }, [makeDepartment()]);
  }));

  it('shows the forbidden state on 403', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === URL)
      .flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('cancels the older list request when a newer one starts', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeDepartment()], 30));
    fixture.componentInstance.table.onLazyLoad({ first: 10, rows: 10 });
    fixture.componentInstance.table.onLazyLoad({ first: 20, rows: 10 });

    const requests = httpMock.match((r) => r.url === URL);
    expect(requests.length).toBe(2);
    expect(requests[0].cancelled).toBeTrue();
    expect(requests[1].request.params.get('page')).toBe('3');
    requests[1].flush(envelope([], 30));
  });

  it('opens the edit page', () => {
    const fixture = create();
    expectList({}, [makeDepartment()]);
    fixture.componentInstance.edit(makeDepartment());
    expect(router.navigate).toHaveBeenCalledWith(['/company/departments', 5, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    acceptConfirmations();
    const fixture = create();
    expectList({}, [makeDepartment(), makeDepartment({ id: 6 })]);

    fixture.componentInstance.confirmDelete(makeDepartment());
    const del = httpMock.expectOne(`${URL}5/`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    expectList({ page: '1' }, [makeDepartment({ id: 6 })]);
  });

  it('goes back a page after deleting the last row on a page', () => {
    acceptConfirmations();
    const fixture = create();
    expectList({}, [makeDepartment()], 11);
    fixture.componentInstance.table.onLazyLoad({ first: 10, rows: 10 });
    expectList({ page: '2' }, [makeDepartment({ id: 15 })], 11);

    fixture.componentInstance.confirmDelete(makeDepartment({ id: 15 }));
    httpMock.expectOne(`${URL}15/`).flush(null, { status: 204, statusText: 'No Content' });

    expectList({ page: '1' }, [makeDepartment()], 10);
  });
});
