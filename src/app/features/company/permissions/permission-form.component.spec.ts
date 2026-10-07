import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermission } from '../../../testing/company-fixtures';
import { PermissionFormComponent } from './permission-form.component';

const URL = '/api/company/v1/permissions/';
const GROUPS_URL = '/api/company/v1/permission-groups/';

describe('PermissionFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [PermissionFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(PermissionFormComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === GROUPS_URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 4, name_en: 'Sales access', name_ar: null }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a permission with its groups', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({
      codename: 'reports.view',
      name: 'View reports',
      description: '',
      permission_type: 'FEATURE',
      groups: [4],
    });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      codename: 'reports.view',
      name: 'View reports',
      description: '',
      permission_type: 'FEATURE',
      groups: [4],
    });
    req.flush(envelope(makePermission()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/permissions']);
  });

  it('leaves out permission_type when none is chosen', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ codename: 'a.b', name: 'A B' });
    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect('permission_type' in req.request.body).toBeFalse();
    req.flush(envelope(makePermission()));
  });

  it('does not submit an invalid form', () => {
    const fixture = setup(null);
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('6');
    httpMock.expectOne(`${URL}6/`).flush(envelope(makePermission({ groups: [{ id: 4, name_en: 'Sales access' }] })));
    expect(fixture.componentInstance.form.getRawValue().groups).toEqual([4]);

    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}6/` && r.method === 'PATCH');
    req.flush(envelope(makePermission()));
  });

  it('shows server field errors', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ codename: 'sales.view', name: 'View sales' });
    fixture.componentInstance.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Unknown error', { codename: ['Already exists.'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Already exists.');
  });
});
