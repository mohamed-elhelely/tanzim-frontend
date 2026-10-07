import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeRegion } from '../../../testing/location-fixtures';
import { RegionFormComponent } from './region-form.component';

const URL = '/api/company/v1/region/';
const COUNTRIES_URL = '/api/company/v1/country/';

describe('RegionFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [RegionFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(RegionFormComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === COUNTRIES_URL && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, name_en: 'Egypt', name_ar: 'مصر' }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('offers countries and creates a region with an upper-case code', () => {
    const component = setup(null).componentInstance;
    expect(component.countryOptions()).toEqual([{ value: 1, label: 'Egypt' }]);

    component.form.setValue({ name_en: 'Cairo Governorate', name_ar: '', country: 1, code: 'cai' });
    component.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Cairo Governorate', name_ar: null, code: 'CAI', country: 1 });
    req.flush(envelope(makeRegion()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/locations/regions']);
  });

  it('sends an empty string when there is no code (the column is not nullable)', () => {
    const component = setup(null).componentInstance;
    component.form.setValue({ name_en: 'Giza', name_ar: '', country: 1, code: '' });
    component.submit();
    const req = httpMock.expectOne((r) => r.method === 'POST');
    expect(req.request.body.code).toBe('');
    req.flush(envelope(makeRegion()));
  });

  it('requires a country and a 2–3 letter code', () => {
    const component = setup(null).componentInstance;
    component.form.setValue({ name_en: 'Giza', name_ar: '', country: null, code: 'GIZA' });
    component.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(component.form.controls.country.hasError('required')).toBeTrue();
    expect(component.form.controls.code.hasError('pattern')).toBeTrue();
  });

  it('loads the region in edit mode', () => {
    const component = setup('2').componentInstance;
    httpMock.expectOne(`${URL}2/`).flush(envelope(makeRegion()));
    expect(component.form.getRawValue()).toEqual({
      name_en: 'Cairo Governorate',
      name_ar: 'محافظة القاهرة',
      country: 1,
      code: 'CAI',
    });
  });
});
