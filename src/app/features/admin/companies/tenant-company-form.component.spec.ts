import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeTenantCompany } from '../../../testing/admin-fixtures';
import { TenantCompanyFormComponent } from './tenant-company-form.component';

const URL = '/api/company/v1/admin/company/';

const VALID = {
  name: ' Acme Trading ',
  legal_name: '',
  domain: 'Acme.Example',
  tax_id: '',
  email: 'info@acme.example',
  phone: '',
  address: '',
  timezone: 'Asia/Riyadh',
  primary_color: '#4f46e5',
  secondary_color: '#ffffff',
  is_active: true,
};

describe('TenantCompanyFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [TenantCompanyFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(TenantCompanyFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a company with a trimmed name and lower-case domain, then returns to the list', () => {
    const component = setup(null).componentInstance;
    component.form.setValue(VALID);
    component.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ ...VALID, name: 'Acme Trading', domain: 'acme.example' });
    req.flush(envelope(makeTenantCompany()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/admin/companies']);
  });

  it('requires the email on create and checks the domain, tax ID and phone formats', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.setValue({ ...VALID, email: '', domain: 'acme', tax_id: 'TX 1', phone: '0501234567' });
    component.submit();
    fixture.detectChanges();

    httpMock.expectNone((r) => r.method === 'POST');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('validation.required');
    expect(text).toContain('admin.hints.domain');
    expect(text).toContain('admin.hints.taxId');
    expect(text).toContain('admin.hints.phone');
  });

  it('loads the company in edit mode and saves with PATCH, email optional', () => {
    const component = setup('1').componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeTenantCompany({ email: '', is_active: false })));
    expect(component.form.getRawValue()).toEqual({
      name: 'Acme Trading',
      legal_name: 'Acme Trading LLC',
      domain: 'acme.example',
      tax_id: 'TX-100',
      email: '',
      phone: '+966501234567',
      address: 'Riyadh',
      timezone: 'Asia/Riyadh',
      primary_color: '#4f46e5',
      secondary_color: '#ffffff',
      is_active: false,
    });

    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body.is_active).toBeFalse();
    req.flush(envelope(makeTenantCompany()));
    expect(router.navigate).toHaveBeenCalledWith(['/admin/companies']);
  });

  it('keeps a saved time zone in the options even if the browser does not list it', () => {
    const component = setup('1').componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeTenantCompany({ timezone: 'Mars/Olympus' })));
    expect(component.timezoneOptions()).toContain('Mars/Olympus');
    expect(component.timezoneOptions()).toContain('UTC');
  });

  it('shows the server message under the field', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.setValue(VALID);
    component.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Invalid', { domain: ['company with this Company Domain already exists.'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('company with this Company Domain already exists.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
