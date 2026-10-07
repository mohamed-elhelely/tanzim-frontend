import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCity, makeCountry, makeDistrict, makeLocation, makeRegion } from '../../../testing/location-fixtures';
import { SiteFormComponent } from './site-form.component';

const URL = '/api/company/v1/location/';
const BASE = '/api/company/v1/';

const KSA = makeCountry({ id: 7, name_en: 'Saudi Arabia', name_ar: null, iso_code: 'SA' });
const RIYADH_REGION = makeRegion({ id: 9, name_en: 'Riyadh Region', name_ar: null, country: KSA });
const RIYADH = makeCity({ id: 10, name_en: 'Riyadh', name_ar: null, region: RIYADH_REGION });

describe('SiteFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [SiteFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(SiteFormComponent);
    fixture.detectChanges();

    httpMock
      .expectOne((r) => r.url === `${BASE}country/` && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, name_en: 'Egypt', name_ar: 'مصر' }, { id: 7, name_en: 'Saudi Arabia', name_ar: null }]));
    httpMock.expectOne(`${BASE}region/?page=1&page_size=100`).flush(envelope([makeRegion(), RIYADH_REGION], 2));
    httpMock.expectOne(`${BASE}city/?page=1&page_size=100`).flush(envelope([makeCity(), RIYADH], 2));
    httpMock
      .expectOne(`${BASE}district/?page=1&page_size=100`)
      .flush(envelope([makeDistrict(), makeDistrict({ id: 11, name_en: 'Olaya', city: RIYADH })], 2));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function values(options: Array<{ value: number }>): number[] {
    return options.map((o) => o.value);
  }

  it('only offers the children of the chosen parent at each level', () => {
    const component = setup(null).componentInstance;
    expect(values(component.countryOptions())).toEqual([1, 7]);
    expect(component.regionOptions()).toEqual([]);

    component.form.controls.country.setValue(7);
    expect(values(component.regionOptions())).toEqual([9]);
    component.form.controls.region.setValue(9);
    expect(values(component.cityOptions())).toEqual([10]);
    component.form.controls.city.setValue(10);
    expect(values(component.districtOptions())).toEqual([11]);
  });

  it('clears the pickers below a parent the user changes', () => {
    const component = setup(null).componentInstance;
    component.form.patchValue({ country: 1, region: 2, city: 3, district: 4 });

    component.onCityChange();
    expect(component.form.controls.district.value).toBeNull();
    expect(component.form.controls.city.value).toBe(3);

    component.form.patchValue({ district: 4 });
    component.onCountryChange();
    expect(component.form.getRawValue()).toEqual(
      jasmine.objectContaining({ country: 1, region: null, city: null, district: null }),
    );
  });

  it('creates a location, converting empty optional fields', () => {
    const component = setup(null).componentInstance;
    component.form.patchValue({
      name_en: ' Head Office ',
      country: 1,
      region: 2,
      city: 3,
      address_line1: ' 1 Nile St ',
    });
    component.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      name_en: 'Head Office',
      name_ar: null,
      code: null,
      location_type: 'office',
      country: 1,
      region: 2,
      city: 3,
      district: null,
      address_line1: '1 Nile St',
      address_line2: '',
      postal_code: null,
      is_active: true,
    });
    req.flush(envelope(makeLocation()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/locations/sites']);
  });

  it('requires the address hierarchy and a code of at least 3 characters', () => {
    const component = setup(null).componentInstance;
    component.form.patchValue({ name_en: 'HQ', code: 'HQ', address_line1: 'x' });
    component.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(component.form.controls.code.hasError('minlength')).toBeTrue();
    expect(component.form.controls.country.hasError('required')).toBeTrue();
    expect(component.form.controls.region.hasError('required')).toBeTrue();
    expect(component.form.controls.city.hasError('required')).toBeTrue();
  });

  it('keeps the loaded hierarchy in edit mode and PATCHes the full body', () => {
    const component = setup('5').componentInstance;
    httpMock.expectOne(`${URL}5/`).flush(envelope(makeLocation({ district: makeDistrict(), location_type: 'warehouse' })));

    expect(component.form.getRawValue()).toEqual(
      jasmine.objectContaining({ country: 1, region: 2, city: 3, district: 4, location_type: 'warehouse' }),
    );
    expect(values(component.districtOptions())).toEqual([4]);

    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}5/` && r.method === 'PATCH');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({ country: 1, region: 2, city: 3, district: 4, code: 'HQ-01' }),
    );
    req.flush(envelope(makeLocation()));
  });

  it('shows a hierarchy error from the server under its picker', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.patchValue({ name_en: 'HQ', country: 1, region: 2, city: 3, address_line1: 'x' });
    component.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Invalid', { region: ['Region must belong to selected country'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(component.form.controls.region.errors).toEqual({ serverError: 'Region must belong to selected country' });
    expect(fixture.nativeElement.textContent).toContain('Region must belong to selected country');
  });
});
