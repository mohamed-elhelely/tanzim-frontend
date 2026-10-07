import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCity, makeCountry, makeRegion } from '../../../testing/location-fixtures';
import { CityFormComponent } from './city-form.component';

const URL = '/api/company/v1/city/';
const REGIONS_URL = '/api/company/v1/region/';

describe('CityFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [CityFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CityFormComponent);
    fixture.detectChanges();
    const regions = httpMock.expectOne((r) => r.url === REGIONS_URL);
    expect(regions.request.params.get('page_size')).toBe('100');
    regions.flush(
      envelope([makeRegion(), makeRegion({ id: 9, name_en: 'Riyadh', country: makeCountry({ id: 7, name_en: 'Saudi Arabia' }) })], 2),
    );
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('labels regions with their country and starts with UTC', () => {
    const component = setup(null).componentInstance;
    expect(component.regionOptions().map((o) => o.label)).toEqual([
      'Cairo Governorate — Egypt',
      'Riyadh — Saudi Arabia',
    ]);
    expect(component.form.controls.timezone.value).toBe('UTC');
    expect(component.timezoneOptions[0].value).toBe('UTC');
  });

  it('creates a city', () => {
    const component = setup(null).componentInstance;
    component.form.setValue({ name_en: 'Cairo', name_ar: 'القاهرة', region: 2, timezone: 'Africa/Cairo' });
    component.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Cairo', name_ar: 'القاهرة', region: 2, timezone: 'Africa/Cairo' });
    req.flush(envelope(makeCity()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/locations/cities']);
  });

  it('loads the city in edit mode', () => {
    const component = setup('3').componentInstance;
    httpMock.expectOne(`${URL}3/`).flush(envelope(makeCity({ timezone: 'Asia/Riyadh' })));
    expect(component.form.getRawValue()).toEqual({
      name_en: 'Cairo',
      name_ar: 'القاهرة',
      region: 2,
      timezone: 'Asia/Riyadh',
    });
  });
});
