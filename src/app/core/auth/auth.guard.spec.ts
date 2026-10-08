import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, companyAdminGuard, companyMemberGuard, guestGuard, platformAdminGuard } from './auth.guard';

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

function configureRole(role: string | null): void {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: AuthService, useValue: { role: () => role } }],
  });
}

describe('platformAdminGuard', () => {
  it('allows platform admins', () => {
    configureRole('ADMIN');
    expect(TestBed.runInInjectionContext(() => platformAdminGuard(route, state))).toBeTrue();
  });

  it('sends company users back to the dashboard', () => {
    configureRole('COMPANY');
    const result = TestBed.runInInjectionContext(() => platformAdminGuard(route, state));
    expect(result instanceof UrlTree).toBeTrue();
    expect((result as UrlTree).toString()).toBe('/dashboard');
  });
});

describe('companyMemberGuard', () => {
  it('allows company users', () => {
    configureRole('EMPLOYEE');
    expect(TestBed.runInInjectionContext(() => companyMemberGuard(route, state))).toBeTrue();
  });

  it('sends platform admins to the Companies screen', () => {
    configureRole('ADMIN');
    const result = TestBed.runInInjectionContext(() => companyMemberGuard(route, state));
    expect((result as UrlTree).toString()).toBe('/admin/companies');
  });
});

describe('companyAdminGuard', () => {
  it('allows company admins', () => {
    configureRole('COMPANY');
    expect(TestBed.runInInjectionContext(() => companyAdminGuard(route, state))).toBeTrue();
  });

  it('sends employees back to the user list', () => {
    configureRole('EMPLOYEE');
    const result = TestBed.runInInjectionContext(() => companyAdminGuard(route, state));
    expect((result as UrlTree).toString()).toBe('/company/users');
  });
});
