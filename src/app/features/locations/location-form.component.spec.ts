import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import {
  CAIRO,
  CAIRO_REGION,
  EGYPT,
  NASR_CITY,
  RIYADH,
  RIYADH_REGION,
  SAUDI,
  makeLocation,
} from '../../testing/location-fixtures';
import { LocationFormComponent } from './location-form.component';
import { Country } from './location.models';

const URL = '/api/company/v1/location/';
const GEO = '/api/company/v1/';

interface Reply {
  body: object;
  status?: number;
}

describe('LocationFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null, countries: Reply = { body: envelope([EGYPT, SAUDI]) }) {
    TestBed.configureTestingModule({
      imports: [LocationFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(LocationFormComponent);
    fixture.detectChanges();

    const countriesReq = httpMock.expectOne((r) => r.url === `${GEO}country/`);
    expect(countriesReq.request.params.get('page_size')).toBe('100');
    const replies: Array<[string, object]> = [
      ['region', envelope([CAIRO_REGION, RIYADH_REGION])],
      ['city', envelope([CAIRO, RIYADH])],
      ['district', envelope([NASR_CITY])],
    ];
    countriesReq.flush(countries.body, countries.status ? { status: countries.status, statusText: 'Error' } : undefined);
    for (const [path, body] of replies) {
      // forkJoin cancels the remaining requests once one fails.
      const req = httpMock.expectOne((r) => r.url === `${GEO}${path}/`);
      if (!req.cancelled) {
        req.flush(body);
      }
    }
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function fillAddress(fixture: ReturnType<typeof setup>) {
    const form = fixture.componentInstance.form;
    form.patchValue({ name_en: 'Head Office', address_line1: '12 Abbas El Akkad St' });
    form.controls.country.setValue(1);
    form.controls.region.setValue(11);
    form.controls.city.setValue(21);
  }

  it('creates a location', () => {
    const fixture = setup(null);
    fillAddress(fixture);
    fixture.componentInstance.form.patchValue({ code: ' HQ-01 ', district: 31 });
    fixture.componentInstance.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      name_en: 'Head Office',
      name_ar: null,
      code: 'HQ-01',
      location_type: 'office',
      country: 1,
      region: 11,
      city: 21,
      district: 31,
      address_line1: '12 Abbas El Akkad St',
      address_line2: '',
      postal_code: null,
      is_active: true,
    });
    req.flush(envelope(makeLocation()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/locations']);
  });

  it('only offers regions, cities and districts under the chosen parent', () => {
    const component = setup(null).componentInstance;
    expect(component.regionOptions()).toEqual([]);

    component.form.controls.country.setValue(2);
    expect(component.regionOptions().map((o) => o.value)).toEqual([12]);
    component.form.controls.region.setValue(12);
    expect(component.cityOptions().map((o) => o.value)).toEqual([22]);
    component.form.controls.city.setValue(22);
    expect(component.districtOptions()).toEqual([]);
  });

  it('clears the lower levels when a parent changes', () => {
    const fixture = setup(null);
    fillAddress(fixture);
    const form = fixture.componentInstance.form;
    form.controls.district.setValue(31);

    form.controls.country.setValue(2);
    expect(form.getRawValue()).toEqual(jasmine.objectContaining({ country: 2, region: null, city: null, district: null }));
  });

  it('does not submit without the required address fields', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.patchValue({ name_en: 'Head Office' });
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('rejects a code shorter than 3 characters', () => {
    const fixture = setup(null);
    fixture.componentInstance.form.controls.code.setValue('HQ');
    expect(fixture.componentInstance.form.controls.code.hasError('minlength')).toBeTrue();
  });

  it('blocks saving when the subscription has no Locations module', () => {
    const fixture = setup(null, { body: errorEnvelope(403, 'Forbidden'), status: 403 });
    expect(fixture.componentInstance.geoState()).toBe('forbidden');
    expect(fixture.componentInstance.canSave()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('locations.geo.forbidden');

    fillAddress(fixture);
    fixture.componentInstance.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });

  it('blocks saving when there are no countries yet', () => {
    const fixture = setup(null, { body: envelope([] as Country[]) });
    expect(fixture.componentInstance.geoState()).toBe('empty');
    expect(fixture.componentInstance.canSave()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('locations.geo.empty');
  });

  it('loads and updates in edit mode without clearing the saved hierarchy', () => {
    const fixture = setup('4');
    httpMock.expectOne(`${URL}4/`).flush(envelope(makeLocation()));
    const component = fixture.componentInstance;
    expect(component.form.getRawValue()).toEqual({
      name_en: 'Head Office',
      name_ar: 'المقر الرئيسي',
      code: 'HQ-01',
      location_type: 'office',
      country: 1,
      region: 11,
      city: 21,
      district: 31,
      address_line1: '12 Abbas El Akkad St',
      address_line2: '',
      postal_code: '11765',
      is_active: true,
    });
    expect(component.districtOptions().map((o) => o.value)).toEqual([31]);

    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}4/` && r.method === 'PATCH');
    expect(req.request.body.district).toBe(31);
    req.flush(envelope(makeLocation()));
  });

  it('keeps a saved region selectable when it is outside the loaded page', () => {
    const fixture = setup('4');
    const farRegion = { ...CAIRO_REGION, id: 99, name_en: 'Far Region' };
    httpMock.expectOne(`${URL}4/`).flush(envelope(makeLocation({ region: farRegion, city: { ...CAIRO, region: farRegion }, district: null })));
    expect(fixture.componentInstance.regionOptions().map((o) => o.value)).toContain(99);
  });

  it('shows backend validation errors on the matching field', () => {
    const fixture = setup(null);
    fillAddress(fixture);
    fixture.componentInstance.submit();
    httpMock
      .expectOne((r) => r.url === URL && r.method === 'POST')
      .flush(errorEnvelope(400, 'Validation error', { city: ['City must belong to selected region'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    expect(fixture.componentInstance.form.controls.city.getError('serverError')).toBe(
      'City must belong to selected region',
    );
  });
});
