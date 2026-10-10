import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeRole } from '../../../testing/company-fixtures';
import { RoleFormComponent } from './role-form.component';

const URL = '/api/company/v1/roles/';
const GROUPS_URL = '/api/company/v1/permission-groups/';
const PERMISSIONS_URL = '/api/company/v1/permissions/';
const PERMISSIONS = [
  { id: 1, codename: 'access_sales', name: 'Access Sales module' },
  { id: 2, codename: 'view_salesorder', name: 'View sales orders' },
  { id: 3, codename: 'add_salesorder', name: 'Add sales orders' },
];

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
      .flush(envelope([{ id: 1, name_en: 'Group 0', name_ar: null, is_core: false }]));
    return fixture;
  }

  /** The matrix loads the company's permissions once it renders (after the role, in edit mode). */
  function flushPermissions(fixture: { detectChanges(): void }): void {
    httpMock.match((r) => r.url === PERMISSIONS_URL && r.params.get('dropdown') === 'true').forEach((r) => r.flush(envelope(PERMISSIONS)));
    fixture.detectChanges();
  }

  afterEach(() => {
    httpMock.match((r) => r.url === PERMISSIONS_URL).forEach((r) => r.flush(envelope([])));
    httpMock.verify();
  });

  it('creates a role', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({ name_en: 'Sales Manager', name_ar: '', permission_groups: [1], permissions: [], is_admin: false });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Sales Manager', name_ar: null, permission_groups: [1], permissions: [], is_admin: false });
    req.flush(envelope(makeRole()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/roles']);
  });

  it('saves single permissions picked in the matrix, without any group', () => {
    const fixture = setup(null);
    flushPermissions(fixture);
    fixture.componentInstance.form.patchValue({ name_en: 'Order clerk' });
    const el: HTMLElement = fixture.nativeElement;
    // Open the Sales module, then tick its access switch and "view sales orders".
    (Array.from(el.querySelectorAll('button[aria-expanded]')) as HTMLButtonElement[])[0].click();
    fixture.detectChanges();
    const boxes = Array.from(el.querySelectorAll('app-permission-picker input[type=checkbox]')) as HTMLInputElement[];
    boxes[0].click();
    boxes[1].click();
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body.permission_groups).toEqual([]);
    expect(req.request.body.permissions).toEqual([1, 2]);
    req.flush(envelope(makeRole()), { status: 201, statusText: 'Created' });
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('3');
    httpMock.expectOne(`${URL}3/`).flush(
      envelope(
        makeRole({
          permission_groups: [{ id: 1, name_en: 'Group 0' }],
          permissions: [{ id: 3, codename: 'add_salesorder', name: 'Add sales orders', permission_type: 'API' }],
        }),
      ),
    );
    expect(fixture.componentInstance.form.getRawValue().permission_groups).toEqual([1]);
    expect(fixture.componentInstance.form.getRawValue().permissions).toEqual([3]);

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
