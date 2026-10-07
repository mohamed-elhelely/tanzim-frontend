import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { SARA_REF, makeCompanyUser, makeDepartment } from '../../../testing/company-fixtures';
import { DepartmentFormComponent } from './department-form.component';

const URL = '/api/company/v1/departments/';
const USERS_URL = '/api/company/v1/company-user/';

describe('DepartmentFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [DepartmentFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);

    const fixture = TestBed.createComponent(DepartmentFormComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, name_en: 'Head office', name_ar: null }, { id: 5, name_en: 'Sales', name_ar: 'المبيعات' }]));
    httpMock.expectOne(USERS_URL).flush(envelope([makeCompanyUser()]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a department and returns to the list', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.setValue({ name_en: ' Finance ', name_ar: '', parent: 1, manager: 9 });
    component.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Finance', name_ar: null, parent: 1, manager: 9 });
    req.flush(envelope(makeDepartment({ id: 8, name_en: 'Finance' })), { status: 201, statusText: 'Created' });

    expect(router.navigate).toHaveBeenCalledWith(['/company/departments']);
  });

  it('does not submit an invalid form', () => {
    const fixture = setup(null);
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.componentInstance.form.controls.name_en.touched).toBeTrue();
  });

  it('loads the department in edit mode and excludes it from parent options', () => {
    const fixture = setup('5');
    httpMock.expectOne(`${URL}5/`).flush(
      envelope(makeDepartment({ parent: { id: 1, name_en: 'Head office' }, manager: SARA_REF })),
    );

    const component = fixture.componentInstance;
    expect(component.form.getRawValue()).toEqual({ name_en: 'Sales', name_ar: 'المبيعات', parent: 1, manager: 9 });
    expect(component.parentOptions().map((o) => o.value)).toEqual([1]);
  });

  it('sends null when an optional picker is cleared on edit', () => {
    const fixture = setup('5');
    httpMock.expectOne(`${URL}5/`).flush(envelope(makeDepartment({ manager: SARA_REF })));

    const component = fixture.componentInstance;
    component.form.controls.manager.setValue(null);
    component.submit();

    const req = httpMock.expectOne((r) => r.url === `${URL}5/` && r.method === 'PATCH');
    expect(req.request.body.manager).toBeNull();
    req.flush(envelope(makeDepartment()));
  });

  it('shows the not-found state when the department does not exist', () => {
    const fixture = setup('99');
    httpMock.expectOne(`${URL}99/`).flush(errorEnvelope(404, 'Not found.'), { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.notFound');
  });

  it('shows server field errors and non-field errors', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.controls.name_en.setValue('Sales');
    component.submit();

    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(
        errorEnvelope(400, 'Unknown error', { name_en: ['Already exists.'], non_field_errors: ['Cycle detected.'] }),
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();

    expect(component.form.controls.name_en.errors).toEqual({ serverError: 'Already exists.' });
    expect(fixture.nativeElement.textContent).toContain('Already exists.');
    expect(fixture.nativeElement.textContent).toContain('Cycle detected.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
