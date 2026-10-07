import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeRole } from '../../../testing/company-fixtures';
import { RoleFormComponent } from './role-form.component';

const URL = '/api/company/v1/roles/';
const GROUPS_URL = '/api/company/v1/permission-groups/';

describe('RoleFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [RoleFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(RoleFormComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === GROUPS_URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, name_en: 'Group 0', name_ar: null }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a role', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({ name_en: 'Sales Manager', name_ar: '', permission_groups: [1], is_admin: false });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Sales Manager', name_ar: null, permission_groups: [1], is_admin: false });
    req.flush(envelope(makeRole()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/roles']);
  });

  it('requires at least one permission group', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ name_en: 'Viewer' });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.controls.permission_groups.hasError('required')).toBeTrue();
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('3');
    httpMock.expectOne(`${URL}3/`).flush(envelope(makeRole({ permission_groups: [{ id: 1, name_en: 'Group 0' }] })));
    expect(fixture.componentInstance.form.getRawValue().permission_groups).toEqual([1]);

    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}3/` && r.method === 'PATCH');
    req.flush(envelope(makeRole()));
  });

  it('shows server field errors', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ name_en: 'Sales Manager', permission_groups: [1] });
    fixture.componentInstance.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Unknown error', { name_en: ['Already exists.'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Already exists.');
  });
});
