import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { UserSession, describeUserAgent } from './sessions.service';
import { SignedInDevicesComponent } from './signed-in-devices.component';

const URL = '/api/company/v1/me/sessions/';
const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

const session = (id: string, overrides: Partial<UserSession> = {}): UserSession => ({
  id,
  created_at: '2026-10-14T08:00:00Z',
  last_used_at: '2026-10-14T09:30:00Z',
  expires_at: '2026-10-21T09:30:00Z',
  ip_address: '196.221.10.4',
  user_agent: CHROME_WINDOWS,
  current: false,
  ...overrides,
});

describe('SignedInDevicesComponent', () => {
  let httpMock: HttpTestingController;
  let accept: (() => void) | undefined;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SignedInDevicesComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(ConfirmationService), 'confirm').and.callFake((c: Confirmation) => {
      accept = c.accept as () => void;
      return TestBed.inject(ConfirmationService);
    });
  });

  afterEach(() => httpMock.verify());

  function create(sessions: UserSession[]) {
    const fixture = TestBed.createComponent(SignedInDevicesComponent);
    fixture.detectChanges();
    httpMock.expectOne(URL).flush(envelope(sessions));
    fixture.detectChanges();
    return fixture;
  }

  it('lists each device by browser and OS, marking this one', () => {
    const fixture = create([session('a', { current: true }), session('b', { user_agent: SAFARI_IPHONE })]);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Chrome');
    expect(text).toContain('Windows');
    expect(text).toContain('Safari');
    expect(text).toContain('iOS');
    expect(text).toContain('profile.sessions.thisDevice');
    // Only the other device has a sign-out button, plus "sign out all other devices".
    expect(fixture.nativeElement.querySelectorAll('li p-button').length).toBe(1);
    expect(fixture.componentInstance.hasOthers()).toBeTrue();
  });

  it('signs one device out and drops it from the list', () => {
    const fixture = create([session('a', { current: true }), session('b')]);
    fixture.componentInstance.signOut(fixture.componentInstance.sessions()![1]);
    accept?.();
    const req = httpMock.expectOne(`${URL}b/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(fixture.componentInstance.sessions()!.map((s) => s.id)).toEqual(['a']);
  });

  it('signs out every other device, then reloads', () => {
    const fixture = create([session('a', { current: true }), session('b'), session('c')]);
    fixture.componentInstance.signOutOthers();
    accept?.();
    const req = httpMock.expectOne(`${URL}revoke-others/`);
    expect(req.request.method).toBe('POST');
    req.flush(envelope({ revoked: 2 }));
    httpMock.expectOne(URL).flush(envelope([session('a', { current: true })]));
    expect(fixture.componentInstance.hasOthers()).toBeFalse();
  });
});

describe('describeUserAgent', () => {
  it('names the browser and OS families', () => {
    expect(describeUserAgent(CHROME_WINDOWS)).toEqual({ browser: 'Chrome', os: 'Windows', mobile: false });
    expect(describeUserAgent(SAFARI_IPHONE)).toEqual({ browser: 'Safari', os: 'iOS', mobile: true });
    expect(describeUserAgent(`${CHROME_WINDOWS} Edg/141.0.0.0`).browser).toBe('Edge');
    expect(describeUserAgent('Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0')).toEqual({
      browser: 'Firefox',
      os: 'Linux',
      mobile: false,
    });
    expect(describeUserAgent('')).toEqual({ browser: '', os: '', mobile: false });
  });
});
