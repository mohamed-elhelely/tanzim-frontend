import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeLocation } from '../../../testing/location-fixtures';
import { SiteListComponent } from './site-list.component';

const URL = '/api/company/v1/location/';

describe('SiteListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(SiteListComponent);
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
    expectList({ page: '1', page_size: '10' }, [makeLocation()]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Head Office');
    expect(fixture.nativeElement.textContent).toContain('locations.types.office');
    expect(fixture.nativeElement.textContent).toContain('1 Nile St');
  });

  it('sends paging, ordering and a debounced search', fakeAsync(() => {
    const fixture = create();
    expectList({}, [makeLocation()], 30);
    fixture.componentInstance.onLazyLoad({ first: 20, rows: 10, sortField: 'name_en', sortOrder: -1 });
    expectList({ page: '3', page_size: '10', ordering: '-name_en' }, []);

    fixture.componentInstance.onSearch('ca ');
    tick(300);
    expectList({ page: '1', search: 'ca' }, [makeLocation()]);
  }));

  it('shows the forbidden state on 403 (no Locations module)', () => {
    const fixture = create();
    httpMock
      .expectOne((r) => r.url === URL)
      .flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page', () => {
    const fixture = create();
    expectList({}, [makeLocation()]);
    fixture.componentInstance.edit(makeLocation());
    expect(router.navigate).toHaveBeenCalledWith(['/locations/sites', 5, 'edit']);
  });

  it('deletes after confirmation and goes back a page when the page empties', () => {
    acceptConfirmations();
    const fixture = create();
    expectList({}, [makeLocation()], 11);
    fixture.componentInstance.onLazyLoad({ first: 10, rows: 10 });
    expectList({ page: '2' }, [makeLocation({ id: 15 })], 11);

    fixture.componentInstance.confirmDelete(makeLocation({ id: 15 }));
    const del = httpMock.expectOne(`${URL}15/`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null, { status: 204, statusText: 'No Content' });

    expectList({ page: '1' }, [makeLocation()], 10);
  });
});
