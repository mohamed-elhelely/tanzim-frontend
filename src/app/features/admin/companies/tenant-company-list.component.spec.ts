import { TestBed } from '@angular/core/testing';
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

  it('loads the full company list without paging params', () => {
    const fixture = create();
    const req = httpMock.expectOne(URL);
    expect(req.request.params.keys().length).toBe(0);
    req.flush(envelope([makeTenantCompany(), makeTenantCompany({ id: 2, name: 'Nile Foods', is_active: false })]));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Acme Trading');
    expect(text).toContain('acme.example');
    expect(text).toContain('Nile Foods');
    expect(text).toContain('common.no');
  });

  it('has no delete action', () => {
    const fixture = create();
    httpMock.expectOne(URL).flush(envelope([makeTenantCompany()]));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pi-trash')).toBeNull();
  });

  it('shows the forbidden state on 403', () => {
    const fixture = create();
    httpMock.expectOne(URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page with the company id', () => {
    const fixture = create();
    httpMock.expectOne(URL).flush(envelope([makeTenantCompany()]));
    fixture.componentInstance.edit(makeTenantCompany({ id: 7 }));
    expect(router.navigate).toHaveBeenCalledWith(['/admin/companies', 7, 'edit']);
  });
});
