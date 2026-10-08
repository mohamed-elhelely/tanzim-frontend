import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { AccessService } from './access.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './auth.model';

const URL = '/api/company/v1/me/';

function me(overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    user: { id: 7, email: 'sara@acme.example', first_name: 'Sara', last_name: 'Ali' },
    is_staff: false,
    company: { id: 1, name: 'Acme' },
    role: { id: 3, name_en: 'Clerk', name_ar: null, is_admin: false },
    is_company_admin: false,
    is_department_manager: false,
    is_team_lead: false,
    has_full_access: false,
    permissions: ['view_team'],
    modules: ['location'],
    ...overrides,
  };
}

describe('AccessService', () => {
  let httpMock: HttpTestingController;
  const user = signal<{ id: string; isStaff: boolean } | null>({ id: '7', isStaff: false });

  function setup(): AccessService {
    TestBed.configureTestingModule({ providers: [...provideApiTesting(), { provide: AuthService, useValue: { user } }] });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(AccessService);
  }

  beforeEach(() => user.set({ id: '7', isStaff: false }));
  afterEach(() => httpMock.verify());

  it('denies everything while loading, then answers from /me', () => {
    const access = setup();
    access.load().subscribe();
    expect(access.can('view_team')).toBeFalse();
    httpMock.expectOne(URL).flush(envelope(me()));
    expect(access.can('view_team')).toBeTrue();
    expect(access.can('add_team')).toBeFalse();
    expect(access.hasModule('location')).toBeTrue();
    expect(access.hasModule('inventory')).toBeFalse();
  });

  it('grants every permission with has_full_access', () => {
    const access = setup();
    access.load().subscribe();
    httpMock.expectOne(URL).flush(envelope(me({ has_full_access: true, permissions: [] })));
    expect(access.can('delete_department')).toBeTrue();
  });

  it('shares one request between callers and does not reload once settled', () => {
    const access = setup();
    access.load().subscribe();
    access.load().subscribe();
    httpMock.expectOne(URL).flush(envelope(me()));
    access.load().subscribe();
    httpMock.expectNone(URL);
  });

  it('fails open when /me fails (the backend still answers 403)', () => {
    const access = setup();
    access.load().subscribe();
    httpMock.expectOne(URL).flush(errorEnvelope(500, 'Boom'), { status: 500, statusText: 'Server Error' });
    expect(access.can('add_team')).toBeTrue();
    expect(access.hasModule('inventory')).toBeTrue();
  });

  it('takes is_staff from /me over the token, and forgets everything when the user changes', () => {
    const access = setup();
    TestBed.tick(); // the effect records the current user
    expect(access.isStaff()).toBeFalse();
    access.load().subscribe();
    httpMock.expectOne(URL).flush(envelope(me({ is_staff: true })));
    expect(access.isStaff()).toBeTrue();

    user.set(null);
    TestBed.tick();
    expect(access.can('view_team')).toBeFalse();
    expect(access.settled()).toBeFalse();
  });

  it('does not wipe a load that started before its first effect run', () => {
    const access = setup();
    access.load().subscribe();
    TestBed.tick();
    httpMock.expectOne(URL).flush(envelope(me()));
    expect(access.settled()).toBeTrue();
    access.load().subscribe();
    httpMock.expectNone(URL);
  });
});
