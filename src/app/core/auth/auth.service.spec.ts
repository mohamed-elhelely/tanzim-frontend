import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { apiBaseUrl } from '../api/api.config';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

const BASE_URL = apiBaseUrl(environment.apiUrl);

function encode(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const future = (): number => Math.floor(Date.now() / 1000) + 3600;

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let tokens: TokenStorageService;

  const accessToken = makeJwt({
    user_id: '7',
    company_id: 3,
    company_role: 'manager',
    is_company_admin: true,
    exp: future(),
  });
  const refreshToken = makeJwt({ user_id: '7', exp: future() });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('stores tokens and derives the user after a successful login', () => {
    let name = null as string | null;
    service.login('admin@example.com', 'secret').subscribe((user) => {
      name = user.name;
      expect(user.role).toBe('COMPANY');
      expect(user.companyId).toBe(3);
      expect(user.isCompanyAdmin).toBeTrue();
    });

    const req = httpMock.expectOne(`${BASE_URL}login/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'admin@example.com', password: 'secret' });
    req.flush({
      success: true,
      data: { access: accessToken, refresh: refreshToken, user: 'Sara Ali', role: 'COMPANY' },
      metadata: { timestamp: '', version: '1.0' },
    });

    expect(name).toBe('Sara Ali');
    expect(tokens.accessToken()).toBe(accessToken);
    expect(tokens.refreshToken()).toBe(refreshToken);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('does not authenticate when login fails', () => {
    let errored = false;
    service.login('admin@example.com', 'bad').subscribe({ error: () => (errored = true) });
    httpMock.expectOne(`${BASE_URL}login/`).flush(
      {
        success: false,
        data: null,
        error: { code: 400, message: 'Unknown error', errors: { non_field_errors: ['bad'] } },
      },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(errored).toBeTrue();
    expect(service.isAuthenticated()).toBeFalse();
    expect(tokens.accessToken()).toBeNull();
  });

  it('deduplicates concurrent refresh requests and updates the access token', () => {
    tokens.setTokens(accessToken, refreshToken);

    let first = null as string | null;
    let second = null as string | null;
    service.refreshAccessToken().subscribe((value) => (first = value));
    service.refreshAccessToken().subscribe((value) => (second = value));

    const requests = httpMock.match(`${BASE_URL}refresh/`);
    expect(requests.length).toBe(1);

    const newAccess = makeJwt({ user_id: '7', exp: future() });
    requests[0].flush({ success: true, data: { access: newAccess }, metadata: { timestamp: '', version: '1.0' } });

    expect(first).toBe(newAccess);
    expect(second).toBe(newAccess);
    expect(tokens.accessToken()).toBe(newAccess);
    expect(tokens.refreshToken()).toBe(refreshToken);
  });

  it('clears tokens and state on logout', () => {
    tokens.setTokens(accessToken, refreshToken);
    service.logout();

    expect(tokens.accessToken()).toBeNull();
    expect(tokens.refreshToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
