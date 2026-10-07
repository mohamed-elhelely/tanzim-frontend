import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
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
        path: 'company',
        loadChildren: () => import('./features/company/company.routes').then((m) => m.COMPANY_ROUTES),
      },
      {
        path: 'locations',
        loadChildren: () => import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
      },
      {
        path: 'inventory',
        loadComponent: () =>
          import('./features/inventory/inventory-page.component').then((m) => m.InventoryPageComponent),
        data: { titleKey: 'nav.inventory' },
      },
      {
        path: 'sales',
        loadComponent: () => import('./features/sales/sales-page.component').then((m) => m.SalesPageComponent),
        data: { titleKey: 'nav.sales' },
      },
      {
        path: 'returns',
        loadComponent: () => import('./features/returns/returns-page.component').then((m) => m.ReturnsPageComponent),
        data: { titleKey: 'nav.returns' },
      },
      {
        path: 'billing',
        loadComponent: () => import('./features/billing/billing-page.component').then((m) => m.BillingPageComponent),
        data: { titleKey: 'nav.billing' },
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications-page.component').then((m) => m.NotificationsPageComponent),
        data: { titleKey: 'nav.notifications' },
      },
      {
        path: 'import-export',
        loadComponent: () =>
          import('./features/import-export/import-export-page.component').then((m) => m.ImportExportPageComponent),
        data: { titleKey: 'nav.importExport' },
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
