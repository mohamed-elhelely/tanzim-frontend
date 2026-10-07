import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCity, makeDistrict } from '../../../testing/location-fixtures';
import { DistrictFormComponent } from './district-form.component';

const URL = '/api/company/v1/district/';
const CITIES_URL = '/api/company/v1/city/';

describe('DistrictFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [DistrictFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(DistrictFormComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === CITIES_URL).flush(envelope([makeCity()], 1));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('labels cities with their region and creates a district without a postal prefix', () => {
    const component = setup(null).componentInstance;
    expect(component.cityOptions()).toEqual([{ value: 3, label: 'Cairo — Cairo Governorate' }]);

    component.form.setValue({ name_en: 'Nasr City', name_ar: '', city: 3, postal_code_prefix: ' ' });
    component.submit();
    expect(component.form.controls.postal_code_prefix.hasError('pattern')).toBeTrue();
    httpMock.expectNone((r) => r.method === 'POST');

    component.form.controls.postal_code_prefix.setValue('');
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Nasr City', name_ar: null, city: 3, postal_code_prefix: null });
    req.flush(envelope(makeDistrict()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/locations/districts']);
  });

  it('loads the district in edit mode', () => {
    const component = setup('4').componentInstance;
    httpMock.expectOne(`${URL}4/`).flush(envelope(makeDistrict({ postal_code_prefix: '117' })));
    expect(component.form.getRawValue()).toEqual({
      name_en: 'Nasr City',
      name_ar: 'مدينة نصر',
      city: 3,
      postal_code_prefix: '117',
    });
  });
});
