import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCompanyUser, makeDepartment, makeRole } from '../../../testing/company-fixtures';
import { UserFormComponent } from './user-form.component';

const URL = '/api/company/v1/company-user/';
const ROLES_URL = '/api/company/v1/roles/';
const DEPARTMENTS_URL = '/api/company/v1/departments/';
const TEAMS_URL = '/api/company/v1/teams/';

describe('UserFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [UserFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(UserFormComponent);
    fixture.detectChanges();
    for (const url of [ROLES_URL, DEPARTMENTS_URL, TEAMS_URL]) {
      httpMock.expectOne((r) => r.url === url && r.params.get('dropdown') === 'true').flush(envelope([]));
    }
    return fixture;
  }

  function fillRequired(fixture: ReturnType<typeof setup>) {
    fixture.componentInstance.form.patchValue({
      email: 'omar@acme.example',
      first_name: 'Omar',
      last_name: 'Hassan',
      password: 'Passw0rd!',
    });
  }

  afterEach(() => httpMock.verify());

  it('requires a password when creating', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ email: 'omar@acme.example', first_name: 'Omar', last_name: 'Hassan' });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.controls.password.hasError('required')).toBeTrue();
  });

  it('creates a user with a nested user object and returns to the list', () => {
    const fixture = setup(null);
    fillRequired(fixture);
    fixture.componentInstance.form.patchValue({ role: 3, is_company_admin: true });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      user: {
        email: 'omar@acme.example',
        first_name: 'Omar',
        last_name: 'Hassan',
        preferred_name: '',
        phone_number: '',
        password: 'Passw0rd!',
      },
      role: 3,
      department: null,
      team: null,
      is_company_admin: true,
      is_department_manager: false,
      is_team_lead: false,
    });
    req.flush(envelope({ user: { email: 'omar@acme.example' } }), { status: 201, statusText: 'Created' });

    expect(router.navigate).toHaveBeenCalledWith(['/company/users']);
  });

  it('hides the password and leaves it out when editing', () => {
    const fixture = setup('12');
    httpMock
      .expectOne(`${URL}12/`)
      .flush(envelope(makeCompanyUser({ role: makeRole(), department: makeDepartment(), is_team_lead: true })));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#password')).toBeNull();
    expect(fixture.componentInstance.form.getRawValue()).toEqual(
      jasmine.objectContaining({ email: 'sara@acme.example', role: 3, department: 5, team: null, is_team_lead: true }),
    );

    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}12/` && r.method === 'PATCH');
    expect('user' in req.request.body).toBeFalse();
    req.flush(envelope(makeCompanyUser()));
  });

  it('edits only role, department, team and flags; login fields are read-only', () => {
    // The backend re-validates a nested `user` on PATCH and rejects the unchanged email as a duplicate.
    const fixture = setup('12');
    httpMock.expectOne(`${URL}12/`).flush(envelope(makeCompanyUser({ role: makeRole() })));
    fixture.detectChanges();

    const controls = fixture.componentInstance.form.controls;
    for (const name of ['email', 'first_name', 'last_name', 'preferred_name', 'phone_number'] as const) {
      expect(controls[name].disabled).withContext(name).toBeTrue();
    }

    controls.department.setValue(5);
    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}12/` && r.method === 'PATCH');
    expect(req.request.body).toEqual({
      role: 3,
      department: 5,
      team: null,
      is_company_admin: false,
      is_department_manager: false,
      is_team_lead: false,
    });
    req.flush(envelope(makeCompanyUser()));
  });

  it('shows a nested user field error under the matching field', () => {
    const fixture = setup(null);
    fillRequired(fixture);
    fixture.componentInstance.submit();

    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Unknown error', { user: { email: ['A user with this email already exists.'] } }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.email.errors).toEqual({
      serverError: 'A user with this email already exists.',
    });
    expect(fixture.nativeElement.textContent).toContain('A user with this email already exists.');
  });
});
