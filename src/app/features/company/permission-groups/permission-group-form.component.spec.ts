import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermissionGroup } from '../../../testing/company-fixtures';
import { PermissionGroupFormComponent } from './permission-group-form.component';

const URL = '/api/company/v1/permission-groups/';

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

  afterEach(() => httpMock.verify());

  it('creates a permission group', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({ name_en: 'Reports', name_ar: '', description: ' Read reports ', is_core: true });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name_en: 'Reports', name_ar: null, description: 'Read reports', is_core: true });
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
    httpMock.expectOne(`${URL}4/`).flush(envelope(makePermissionGroup({ description: 'All sales screens' })));
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      name_en: 'Sales access',
      name_ar: '',
      description: 'All sales screens',
      is_core: false,
    });

    fixture.componentInstance.submit();
    const req = httpMock.expectOne(`${URL}4/`);
    expect(req.request.method).toBe('PATCH');
    req.flush(envelope(makePermissionGroup()));
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
