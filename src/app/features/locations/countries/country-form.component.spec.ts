import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCountry } from '../../../testing/location-fixtures';
import { CountryFormComponent } from './country-form.component';

const URL = '/api/company/v1/country/';

describe('CountryFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [CountryFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CountryFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a country with an upper-case ISO code and returns to the list', () => {
    const component = setup(null).componentInstance;
    component.form.setValue({ name_en: ' Egypt ', name_ar: '', iso_code: 'eg', phone_code: '+20', is_active: true });
    component.submit();

    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name_en: 'Egypt', name_ar: null, iso_code: 'EG', phone_code: '+20', is_active: true });
    req.flush(envelope(makeCountry()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/locations/countries']);
  });

  it('rejects a bad ISO code or phone code before sending', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.setValue({ name_en: 'Egypt', name_ar: '', iso_code: 'EGY', phone_code: '20', is_active: true });
    component.submit();
    fixture.detectChanges();

    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.nativeElement.textContent).toContain('locations.hints.isoCode');
    expect(fixture.nativeElement.textContent).toContain('locations.hints.phoneCode');
  });

  it('loads the country in edit mode and saves with PATCH', () => {
    const component = setup('1').componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeCountry({ is_active: false })));
    expect(component.form.getRawValue()).toEqual({
      name_en: 'Egypt',
      name_ar: 'مصر',
      iso_code: 'EG',
      phone_code: '+20',
      is_active: false,
    });

    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body.is_active).toBeFalse();
    req.flush(envelope(makeCountry()));
  });

  it('shows the server message under the field', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.setValue({ name_en: 'Egypt', name_ar: '', iso_code: 'EG', phone_code: '+20', is_active: true });
    component.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Invalid', { iso_code: ['ISO code must be 2 uppercase letters'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ISO code must be 2 uppercase letters');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
