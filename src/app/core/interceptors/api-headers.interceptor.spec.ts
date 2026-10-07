import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../api/api.config';
import { apiHeadersInterceptor } from './api-headers.interceptor';

describe('apiHeadersInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiHeadersInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'https://api.example.test/api/' },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('adds the ngrok header to API requests', () => {
    http.get('https://api.example.test/api/company/v1/location/').subscribe();
    const req = httpMock.expectOne('https://api.example.test/api/company/v1/location/');
    expect(req.request.headers.get('ngrok-skip-browser-warning')).toBe('true');
    req.flush({});
  });

  it('leaves other requests alone', () => {
    http.get('./assets/i18n/en.json').subscribe();
    const req = httpMock.expectOne('./assets/i18n/en.json');
    expect(req.request.headers.has('ngrok-skip-browser-warning')).toBeFalse();
    req.flush({});
  });
});
