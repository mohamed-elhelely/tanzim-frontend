import { Routes } from '@angular/router';

/** Lazy routes under /company. Each resource adds its list, new and edit routes below. */
export const COMPANY_ROUTES: Routes = [{ path: '', pathMatch: 'full', redirectTo: 'users' }];
