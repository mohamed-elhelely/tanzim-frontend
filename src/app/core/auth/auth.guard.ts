import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? true : router.createUrlTree(['/auth/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAuthenticated() ? router.createUrlTree(['/dashboard']) : true;
};

/** Platform admins (users without a company). Everyone else goes back to the dashboard. */
export const platformAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.role() === 'ADMIN' ? true : router.createUrlTree(['/dashboard']);
};

/** Users who belong to a company. Platform admins have none, so they go to their Companies screen. */
export const companyMemberGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.role() === 'ADMIN' ? router.createUrlTree(['/admin/companies']) : true;
};

/** Company admins only (the backend allows only them to add, edit or delete company users). */
export const companyAdminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.role() === 'COMPANY' ? true : router.createUrlTree(['/company/users']);
};
