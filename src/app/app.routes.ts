import { Routes } from '@angular/router';
import { authGuard, companyMemberGuard, guestGuard, platformAdminGuard } from './core/auth/auth.guard';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login-page.component').then((m) => m.LoginPageComponent),
        canActivate: [guestGuard],
        data: { titleKey: 'auth.login' },
      },
    ],
  },
  {
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page.component').then((m) => m.DashboardPageComponent),
        data: { titleKey: 'nav.dashboard' },
      },
      {
        path: 'admin',
        canActivate: [platformAdminGuard],
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: 'company',
        canActivate: [companyMemberGuard],
        loadChildren: () => import('./features/company/company.routes').then((m) => m.COMPANY_ROUTES),
      },
      {
        path: 'locations',
        canActivate: [companyMemberGuard],
        loadChildren: () => import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
      },
      {
        path: 'inventory',
        canActivate: [companyMemberGuard],
        loadChildren: () => import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
      {
        path: 'sales',
        canActivate: [companyMemberGuard],
        loadComponent: () => import('./features/sales/sales-page.component').then((m) => m.SalesPageComponent),
        data: { titleKey: 'nav.sales' },
      },
      {
        path: 'returns',
        canActivate: [companyMemberGuard],
        loadComponent: () => import('./features/returns/returns-page.component').then((m) => m.ReturnsPageComponent),
        data: { titleKey: 'nav.returns' },
      },
      {
        path: 'billing',
        canActivate: [companyMemberGuard],
        loadComponent: () => import('./features/billing/billing-page.component').then((m) => m.BillingPageComponent),
        data: { titleKey: 'nav.billing' },
      },
      {
        path: 'notifications',
        canActivate: [companyMemberGuard],
        loadComponent: () =>
          import('./features/notifications/notifications-page.component').then((m) => m.NotificationsPageComponent),
        data: { titleKey: 'nav.notifications' },
      },
      {
        path: 'import-export',
        canActivate: [companyMemberGuard],
        loadComponent: () =>
          import('./features/import-export/import-export-page.component').then((m) => m.ImportExportPageComponent),
        data: { titleKey: 'nav.importExport' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
