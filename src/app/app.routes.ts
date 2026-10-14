import { Routes } from '@angular/router';
import { authGuard, companyMemberGuard, guestGuard, permissionGuard, platformAdminGuard } from './core/auth/auth.guard';
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
    // Printable documents, outside the shell (no sidebar or header on paper).
    path: 'print/sales-invoices/:id',
    canActivate: [authGuard, companyMemberGuard, permissionGuard],
    data: { permission: 'view_salesinvoice', titleKey: 'print.invoice' },
    loadComponent: () =>
      import('./features/sales/invoices/sales-invoice-print.component').then((m) => m.SalesInvoicePrintComponent),
  },
  {
    path: 'print/delivery-notes/:id',
    canActivate: [authGuard, companyMemberGuard, permissionGuard],
    data: { permission: 'view_deliverynote', titleKey: 'print.deliveryNote' },
    loadComponent: () =>
      import('./features/sales/deliveries/delivery-note-print.component').then((m) => m.DeliveryNotePrintComponent),
  },
  {
    path: 'print/sales-orders/:id',
    canActivate: [authGuard, companyMemberGuard, permissionGuard],
    data: { permission: 'view_salesorder', titleKey: 'print.orderConfirmation' },
    loadComponent: () =>
      import('./features/sales/orders/sales-order-print.component').then((m) => m.SalesOrderPrintComponent),
  },
  {
    path: 'print/variant-labels',
    canActivate: [authGuard, companyMemberGuard, permissionGuard],
    data: { permission: 'view_productvariant', titleKey: 'labels.title' },
    loadComponent: () =>
      import('./features/inventory/variants/variant-labels-print.component').then((m) => m.VariantLabelsPrintComponent),
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
        canActivate: [companyMemberGuard, permissionGuard],
        data: { permission: 'access_company' },
        loadChildren: () => import('./features/company/company.routes').then((m) => m.COMPANY_ROUTES),
      },
      {
        path: 'locations',
        canActivate: [companyMemberGuard, permissionGuard],
        data: { permission: 'access_location' },
        loadChildren: () => import('./features/locations/locations.routes').then((m) => m.LOCATIONS_ROUTES),
      },
      {
        path: 'inventory',
        canActivate: [companyMemberGuard, permissionGuard],
        data: { permission: 'access_inventory' },
        loadChildren: () => import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
      {
        path: 'sales',
        canActivate: [companyMemberGuard, permissionGuard],
        data: { permission: 'access_sales' },
        loadChildren: () => import('./features/sales/sales.routes').then((m) => m.SALES_ROUTES),
      },
      {
        path: 'returns',
        canActivate: [companyMemberGuard, permissionGuard],
        data: { permission: 'access_returns' },
        loadChildren: () => import('./features/returns/returns.routes').then((m) => m.RETURNS_ROUTES),
      },
      {
        path: 'accounting',
        canActivate: [companyMemberGuard, permissionGuard],
        data: { permission: 'access_accounting' },
        loadChildren: () => import('./features/accounting/accounting.routes').then((m) => m.ACCOUNTING_ROUTES),
      },
      {
        path: 'analytics',
        canActivate: [companyMemberGuard, permissionGuard],
        data: { permission: 'access_reports' },
        loadChildren: () => import('./features/analytics/analytics.routes').then((m) => m.ANALYTICS_ROUTES),
      },
      {
        path: 'billing',
        canActivate: [companyMemberGuard],
        loadComponent: () => import('./features/billing/billing-page.component').then((m) => m.BillingPageComponent),
        data: { titleKey: 'nav.billing' },
      },
      {
        // Every signed-in user edits their own profile and password, platform staff included.
        path: 'profile',
        loadComponent: () => import('./features/profile/profile-page.component').then((m) => m.ProfilePageComponent),
        data: { titleKey: 'profile.title' },
      },
      {
        // Every signed-in user has notifications, platform staff included.
        path: 'notifications',
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
