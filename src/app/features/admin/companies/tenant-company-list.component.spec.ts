import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeTenantCompany } from '../../../testing/admin-fixtures';
import { TenantCompanyListComponent } from './tenant-company-list.component';

const URL = '/api/company/v1/admin/company/';

describe('TenantCompanyListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantCompanyListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(TenantCompanyListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page from the server', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makeTenantCompany(), makeTenantCompany({ id: 2, name: 'Nile Foods', is_active: false })], 2));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Acme Trading');
    expect(text).toContain('Nile Foods');
    expect(text).toContain('common.no');
    expect(fixture.nativeElement.querySelector('.pi-trash')).toBeNull();
  });

  it('searches on the server', fakeAsync(() => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeTenantCompany()], 1));
    fixture.componentInstance.table.onSearch('nile');
    tick(300);
    httpMock.expectOne((r) => r.url === URL && r.params.get('search') === 'nile').flush(envelope([], 0));
  }));

  it('shows the forbidden state on 403', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page with the company id', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeTenantCompany()], 1));
    fixture.componentInstance.edit(makeTenantCompany({ id: 7 }));
    expect(router.navigate).toHaveBeenCalledWith(['/admin/companies', 7, 'edit']);
  });
});
