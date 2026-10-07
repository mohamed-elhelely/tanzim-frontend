import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { SARA_REF, makeCompanyUser, makeTeam } from '../../../testing/company-fixtures';
import { TeamFormComponent } from './team-form.component';

const URL = '/api/company/v1/teams/';
const DEPARTMENTS_URL = '/api/company/v1/departments/';
const LOCATIONS_URL = '/api/company/v1/location/';
const USERS_URL = '/api/company/v1/company-user/';

type LocationReply = { body: object; status?: number };

describe('TeamFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null, locations: LocationReply = { body: envelope([{ id: 1, name_en: 'HQ', name_ar: null }]) }) {
    TestBed.configureTestingModule({
      imports: [TeamFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(TeamFormComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === DEPARTMENTS_URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 5, name_en: 'Sales', name_ar: 'المبيعات' }]));
    httpMock.expectOne(USERS_URL).flush(envelope([makeCompanyUser()]));
    httpMock
      .expectOne((r) => r.url === LOCATIONS_URL && r.params.get('dropdown') === 'true')
      .flush(locations.body, locations.status ? { status: locations.status, statusText: 'Error' } : undefined);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a team', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.setValue({ department: 5, name_en: 'B2B Team', name_ar: '', location: 1, leads: [9] });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ department: 5, name_en: 'B2B Team', name_ar: null, location: 1, leads: [9] });
    req.flush(envelope(makeTeam()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/company/teams']);
  });

  it('does not submit without department and location', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ name_en: 'B2B Team' });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('blocks saving when the subscription has no Locations module', () => {
    const fixture = setup(null, { body: errorEnvelope(403, 'Forbidden'), status: 403 });
    expect(fixture.componentInstance.locationState()).toBe('forbidden');
    expect(fixture.componentInstance.canSave()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('company.teams.locationForbidden');

    fixture.componentInstance.form.setValue({ department: 5, name_en: 'B2B Team', name_ar: '', location: 1, leads: [] });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('blocks saving when there are no locations yet', () => {
    const fixture = setup(null, { body: envelope([]) });
    expect(fixture.componentInstance.locationState()).toBe('empty');
    expect(fixture.componentInstance.canSave()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('company.teams.locationEmpty');
  });

  it('loads and updates in edit mode', () => {
    const fixture = setup('7');
    httpMock.expectOne(`${URL}7/`).flush(envelope(makeTeam({ leads: [SARA_REF] })));
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      department: 5,
      name_en: 'B2B Team',
      name_ar: '',
      location: 1,
      leads: [9],
    });

    fixture.componentInstance.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}7/` && r.method === 'PATCH');
    req.flush(envelope(makeTeam()));
  });
});
