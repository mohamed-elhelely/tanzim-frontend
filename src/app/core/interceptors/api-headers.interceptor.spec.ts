import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../../environments/environment';
import { apiHeadersInterceptor } from './api-headers.interceptor';

describe('apiHeadersInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const original = environment.apiHeaders;

  beforeEach(() => {
    environment.apiHeaders = { 'ngrok-skip-browser-warning': 'true' };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiHeadersInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    environment.apiHeaders = original;
    httpMock.verify();
  });

  it('adds the configured headers to API requests', () => {
    http.get('/api/company/v1/country/').subscribe();
    const req = httpMock.expectOne('/api/company/v1/country/');
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
