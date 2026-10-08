import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AccessService } from './access.service';
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

/** Platform staff (Companies screens). Everyone else goes back to the dashboard. */
export const platformAdminGuard: CanActivateFn = () => {
  const access = inject(AccessService);
  const router = inject(Router);
  return access.load().pipe(map(() => (access.isStaff() ? true : router.createUrlTree(['/dashboard']))));
};

/** Users who belong to a company. Users without one go to the Companies screen (staff) or the dashboard. */
export const companyMemberGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  if (auth.role() !== 'ADMIN') {
    return true;
  }
  const access = inject(AccessService);
  const router = inject(Router);
  return access.load().pipe(map(() => router.createUrlTree([access.isStaff() ? '/admin/companies' : '/dashboard'])));
};

/**
 * Routes with `data: { permission: 'add_department' }`: waits for /me, then lets the user in or sends them
 * to the dashboard. Routes without a permission pass.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const permission = route.data['permission'] as string | undefined;
  if (!permission) {
    return true;
  }
  const access = inject(AccessService);
  const router = inject(Router);
  return access.load().pipe(map(() => (access.can(permission) ? true : router.createUrlTree(['/dashboard']))));
};
