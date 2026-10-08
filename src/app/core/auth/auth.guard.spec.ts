import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { Observable, firstValueFrom, isObservable, of } from 'rxjs';
import { AccessService } from './access.service';
import { authGuard, companyMemberGuard, guestGuard, permissionGuard, platformAdminGuard } from './auth.guard';

function configure(isAuthenticated: boolean): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isAuthenticated: () => isAuthenticated } },
    ],
  });
}

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('authGuard', () => {
  it('allows access when authenticated', () => {
    configure(true);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result).toBeTrue();
  });

  it('redirects to login when unauthenticated', () => {
    configure(false);
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/auth/login');
  });
});

describe('guestGuard', () => {
  it('redirects authenticated users to the dashboard', () => {
    configure(true);
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/dashboard');
    expect(TestBed.inject(Router)).toBeTruthy();
  });

  it('allows guests to view public pages', () => {
    configure(false);
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(result).toBeTrue();
  });
});

/** A fake AccessService whose /me has already answered. */
function configureAccess(role: string | null, access: { isStaff?: boolean; permissions?: string[] } = {}): void {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { role: () => role } },
      {
        provide: AccessService,
        useValue: {
          load: () => of(undefined),
          isStaff: () => access.isStaff ?? false,
          can: (codename: string) => (access.permissions ?? []).includes(codename),
        },
      },
    ],
  });
}

async function run(guard: CanActivateFn, data: Record<string, unknown> = {}): Promise<boolean | UrlTree> {
  const result = TestBed.runInInjectionContext(() => guard({ data } as unknown as ActivatedRouteSnapshot, state));
  return isObservable(result) ? firstValueFrom(result as Observable<boolean | UrlTree>) : (result as boolean | UrlTree);
}

describe('platformAdminGuard', () => {
  it('allows platform staff', async () => {
    configureAccess('ADMIN', { isStaff: true });
    expect(await run(platformAdminGuard)).toBeTrue();
  });

  it('sends everyone else to the dashboard, including users without a company who are not staff', async () => {
    configureAccess('ADMIN', { isStaff: false });
    expect((await run(platformAdminGuard)).toString()).toBe('/dashboard');
  });
});

describe('companyMemberGuard', () => {
  it('allows company users without waiting for /me', async () => {
    configureAccess('EMPLOYEE');
    expect(await run(companyMemberGuard)).toBeTrue();
  });

  it('sends platform staff to the Companies screen and other company-less users to the dashboard', async () => {
    configureAccess('ADMIN', { isStaff: true });
    expect((await run(companyMemberGuard)).toString()).toBe('/admin/companies');
    TestBed.resetTestingModule();
    configureAccess('ADMIN', { isStaff: false });
    expect((await run(companyMemberGuard)).toString()).toBe('/dashboard');
  });
});

describe('permissionGuard', () => {
  it('lets routes without a permission through', async () => {
    configureAccess('EMPLOYEE');
    expect(await run(permissionGuard)).toBeTrue();
  });

  it('checks data.permission once /me has answered', async () => {
    configureAccess('EMPLOYEE', { permissions: ['view_team'] });
    expect(await run(permissionGuard, { permission: 'view_team' })).toBeTrue();
    expect((await run(permissionGuard, { permission: 'add_team' })).toString()).toBe('/dashboard');
  });
});
