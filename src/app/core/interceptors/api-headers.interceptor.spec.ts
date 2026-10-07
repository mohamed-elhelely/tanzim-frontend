import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { apiHeadersInterceptor } from './api-headers.interceptor';

describe('apiHeadersInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiHeadersInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function headerFor(url: string): string | null {
    http.get(url).subscribe();
    const req = httpMock.expectOne(url);
    req.flush({});
    return req.request.headers.get('ngrok-skip-browser-warning');
  }

  it('skips the ngrok browser warning for ngrok hosts', () => {
    expect(headerFor('https://chunk-surcharge-manhood.ngrok-free.dev/api/company/v1/country/')).toBe('true');
    expect(headerFor('https://abc.ngrok-free.app/api/login/')).toBe('true');
  });

  it('leaves other requests alone', () => {
    expect(headerFor('/api/company/v1/country/')).toBeNull();
    expect(headerFor('./assets/i18n/en.json')).toBeNull();
    expect(headerFor('https://example.com/ngrok-free.dev/x')).toBeNull();
  });
});
