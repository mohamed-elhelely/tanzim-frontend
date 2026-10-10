import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermissionGroup } from '../../../testing/company-fixtures';
import { PermissionGroupFormComponent } from './permission-group-form.component';

const URL = '/api/company/v1/permission-groups/';
const PERMISSIONS_URL = '/api/company/v1/permissions/';

describe('PermissionGroupFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [PermissionGroupFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(PermissionGroupFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    // The permission matrix loads the company's permissions once it renders.
    httpMock.match((r) => r.url === PERMISSIONS_URL).forEach((r) => r.flush(envelope([])));
    httpMock.verify();
  });

  it('creates a permission group', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({ name_en: 'Reports', name_ar: '', description: ' Read reports ', permissions: [5, 9] });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name_en: 'Reports', name_ar: null, description: 'Read reports', permissions: [5, 9] });
    req.flush(envelope(makePermissionGroup()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/permission-groups']);
  });

  it('does not submit an invalid form', () => {
    const fixture = setup(null);
    fixture.componentInstance.submit();
    httpMock.expectNone(URL);
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('4');
    httpMock.expectOne(`${URL}4/`).flush(
      envelope(
        makePermissionGroup({
          description: 'All sales screens',
          permissions: [{ id: 2, codename: 'view_salesorder', name: 'View sales orders', permission_type: 'API' }],
        }),
      ),
    );
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      name_en: 'Sales access',
      name_ar: '',
      description: 'All sales screens',
      permissions: [2],
    });

    fixture.componentInstance.submit();
    const req = httpMock.expectOne(`${URL}4/`);
    expect(req.request.method).toBe('PATCH');
    req.flush(envelope(makePermissionGroup()));
  });

  it('shows a core group read-only, without a save button', () => {
    const fixture = setup('1');
    httpMock.expectOne(`${URL}1/`).flush(envelope(makePermissionGroup({ id: 1, name_en: 'Full Access', is_core: true })));
    fixture.detectChanges();
    expect(fixture.componentInstance.form.disabled).toBeTrue();
    expect(fixture.nativeElement.querySelector('button[type=submit]')).toBeNull();
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'PATCH');
  });

  it('shows server field errors', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.controls.name_en.setValue('Reports');
    fixture.componentInstance.submit();
    httpMock
      .expectOne(URL)
      .flush(errorEnvelope(400, 'Unknown error', { name_en: ['Already exists.'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Already exists.');
  });
});
