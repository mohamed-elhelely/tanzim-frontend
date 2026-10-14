import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

const BASE_URL = `${environment.apiBaseUrl.replace(/\/+$/, '')}/`;

function encode(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function makeJwt(payload: Record<string, unknown>): string {
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.signature`;
}

const future = (): number => Math.floor(Date.now() / 1000) + 3600;
const past = (): number => Math.floor(Date.now() / 1000) - 60;
/** Lets the Web Lock (granted asynchronously) start the refresh request. */
/** Waits (up to a second) until requests to `url` are pending, then takes them. */
async function waitForRequests(httpMock: HttpTestingController, url: string) {
  for (let waited = 0; waited < 1000; waited += 10) {
    const requests = httpMock.match(url);
    if (requests.length) {
      // Give a second, wrongly duplicated refresh the same chance to show up.
      await new Promise((resolve) => setTimeout(resolve, 20));
      return requests.concat(httpMock.match(url));
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return [];
}
const ok = <T>(data: T) => ({ success: true, data, metadata: { timestamp: '', version: '1.0' } });

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

  it('shares one refresh between callers and stores both rotated tokens', async () => {
    tokens.setTokens(accessToken, refreshToken);

    const first = firstValueFrom(service.refreshAccessToken());
    const second = firstValueFrom(service.refreshAccessToken());
    // The refresh runs inside a Web Lock, granted asynchronously: wait for its request rather than a fixed delay.
    const requests = await waitForRequests(httpMock, `${BASE_URL}refresh/`);
    expect(requests.length).toBe(1);
    expect(requests[0].request.body).toEqual({ refresh: refreshToken });

    const newAccess = makeJwt({ user_id: '7', exp: future() });
    const newRefresh = makeJwt({ user_id: '7', exp: future(), jti: 'next' });
    requests[0].flush(ok({ access: newAccess, refresh: newRefresh, expires_in: 1800, refresh_expires_in: 604800 }));

    expect(await first).toBe(newAccess);
    expect(await second).toBe(newAccess);
    expect(tokens.accessToken()).toBe(newAccess);
    expect(tokens.refreshToken()).toBe(newRefresh);
  });

  it("uses the tokens another tab already rotated instead of sending the spent refresh token", async () => {
    tokens.setTokens(accessToken, refreshToken);
    const refreshing = firstValueFrom(service.refreshAccessToken());
    // Another tab refreshed meanwhile and stored its new pair.
    const otherAccess = makeJwt({ user_id: '7', exp: future(), jti: 'other' });
    localStorage.setItem('tanzim.accessToken', otherAccess);
    localStorage.setItem('tanzim.refreshToken', makeJwt({ user_id: '7', exp: future(), jti: 'other-refresh' }));
    expect(await refreshing).toBe(otherAccess);
    httpMock.expectNone(`${BASE_URL}refresh/`);
  });

  it('ends the server session on logout (refresh token in the body), then clears everything', () => {
    tokens.setTokens(accessToken, refreshToken);
    service.logout();

    const req = httpMock.expectOne(`${BASE_URL}logout/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refresh: refreshToken });
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(tokens.accessToken()).toBeNull();
    expect(tokens.refreshToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('endSession forgets the session without calling the server', () => {
    tokens.setTokens(accessToken, refreshToken);
    service.endSession();
    httpMock.expectNone(`${BASE_URL}logout/`);
    expect(tokens.refreshToken()).toBeNull();
  });
});

describe('AuthService on reload', () => {
  const user = { user_id: '7', company_id: 3, is_company_admin: false };

  function boot(access: string, refresh: string) {
    localStorage.clear();
    localStorage.setItem('tanzim.accessToken', access);
    localStorage.setItem('tanzim.refreshToken', refresh);
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    return TestBed.inject(AuthService);
  }

  afterEach(() => localStorage.clear());

  it('stays signed in with an expired access token while the refresh token is valid', () => {
    const service = boot(makeJwt({ ...user, exp: past() }), makeJwt({ user_id: '7', exp: future() }));
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.role()).toBe('EMPLOYEE');
  });

  it('signs out when the refresh token has expired too', () => {
    const service = boot(makeJwt({ ...user, exp: past() }), makeJwt({ user_id: '7', exp: past() }));
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('tanzim.accessToken')).toBeNull();
  });

  it('follows a logout in another tab', () => {
    const service = boot(makeJwt({ ...user, exp: future() }), makeJwt({ user_id: '7', exp: future() }));
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    expect(service.isAuthenticated()).toBeTrue();
    localStorage.clear();
    TestBed.inject(TokenStorageService).reload();
    TestBed.tick();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
