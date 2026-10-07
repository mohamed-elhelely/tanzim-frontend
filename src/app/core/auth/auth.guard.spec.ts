import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { authGuard, guestGuard } from './auth.guard';

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
