import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { authInterceptor } from './auth.interceptor';

const UNAUTHORIZED = { status: 401, statusText: 'Unauthorized' };

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let tokens: TokenStorageService;
  let refresh$: Subject<string>;
  let auth: { refreshAccessToken: jasmine.Spy; logout: jasmine.Spy };

  beforeEach(() => {
    localStorage.clear();
    refresh$ = new Subject<string>();
    auth = {
      refreshAccessToken: jasmine.createSpy('refreshAccessToken').and.callFake(() => refresh$),
      logout: jasmine.createSpy('logout'),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenStorageService);
    tokens.setTokens('old-access', 'refresh-token');
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adds the bearer token to API requests', () => {
    http.get('/api/sales/customers/').subscribe();
    const req = httpMock.expectOne('/api/sales/customers/');
    expect(req.request.headers.get('Authorization')).toBe('Bearer old-access');
    req.flush({});
  });

  it('does not add a token to the login and refresh endpoints', () => {
    http.post('/api/login/', {}).subscribe();
    http.post('/api/refresh/', {}).subscribe();
    httpMock.expectOne('/api/login/').flush({});
    const refreshReq = httpMock.match('/api/refresh/')[0];
    expect(refreshReq.request.headers.has('Authorization')).toBeFalse();
    refreshReq.flush({});
  });

  it('refreshes once and retries the original request after a 401', () => {
    let result: unknown;
    http.get('/api/company/v1/team/').subscribe((value) => (result = value));

    httpMock.expectOne('/api/company/v1/team/').flush(null, UNAUTHORIZED);
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);

    refresh$.next('new-access');
    refresh$.complete();

    const retry = httpMock.expectOne('/api/company/v1/team/');
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush({ ok: true });

    expect(result).toEqual({ ok: true });
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('retries every request that failed with 401 using the refreshed token', () => {
    http.get('/api/a/').subscribe();
    http.get('/api/b/').subscribe();

    httpMock.expectOne('/api/a/').flush(null, UNAUTHORIZED);
    httpMock.expectOne('/api/b/').flush(null, UNAUTHORIZED);

    refresh$.next('new-access');
    refresh$.complete();

    for (const url of ['/api/a/', '/api/b/']) {
      const retry = httpMock.expectOne(url);
      expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
      retry.flush({});
    }
    expect(auth.logout).not.toHaveBeenCalled();
  });

  it('logs out when the refresh request fails', () => {
    let failed = false;
    http.get('/api/a/').subscribe({ error: () => (failed = true) });

    httpMock.expectOne('/api/a/').flush(null, UNAUTHORIZED);
    refresh$.error({ status: 401, message: 'expired', errors: {} });

    expect(failed).toBeTrue();
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('logs out without refreshing when there is no refresh token', () => {
    tokens.clear();
    tokens.setTokens('old-access');

    let failed = false;
    http.get('/api/a/').subscribe({ error: () => (failed = true) });
    httpMock.expectOne('/api/a/').flush(null, UNAUTHORIZED);

    expect(failed).toBeTrue();
    expect(auth.refreshAccessToken).not.toHaveBeenCalled();
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });

  it('logs out instead of looping when the retried request is still unauthorized', () => {
    let failed = false;
    http.get('/api/a/').subscribe({ error: () => (failed = true) });

    httpMock.expectOne('/api/a/').flush(null, UNAUTHORIZED);
    refresh$.next('new-access');
    refresh$.complete();
    httpMock.expectOne('/api/a/').flush(null, UNAUTHORIZED);

    expect(failed).toBeTrue();
    expect(auth.refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(auth.logout).toHaveBeenCalledTimes(1);
  });
});
