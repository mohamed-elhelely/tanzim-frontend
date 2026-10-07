import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { CityService } from './cities/city.service';
import { CountryService } from './countries/country.service';
import { DistrictService } from './districts/district.service';
import { LocationService } from './location.service';
import { RegionService } from './regions/region.service';

describe('location resource services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const cases: Array<[string, () => { all(): import('rxjs').Observable<unknown> }]> = [
    ['/api/company/v1/country/', () => TestBed.inject(CountryService)],
    ['/api/company/v1/region/', () => TestBed.inject(RegionService)],
    ['/api/company/v1/city/', () => TestBed.inject(CityService)],
    ['/api/company/v1/district/', () => TestBed.inject(DistrictService)],
    ['/api/company/v1/location/', () => TestBed.inject(LocationService)],
  ];

  for (const [url, service] of cases) {
    it(`calls ${url}`, () => {
      service().all().subscribe();
      httpMock.expectOne(url).flush(envelope([]));
    });
  }
});
