import { Routes } from '@angular/router';

/** Lazy routes under /admin, for platform staff (guarded in app.routes.ts). */
export const ADMIN_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'companies' },
  {
    path: 'companies',
    loadComponent: () =>
      import('./companies/tenant-company-list.component').then((m) => m.TenantCompanyListComponent),
    data: { titleKey: 'admin.companies.title' },
  },
  {
    path: 'companies/new',
    loadComponent: () =>
      import('./companies/tenant-company-form.component').then((m) => m.TenantCompanyFormComponent),
    data: { titleKey: 'admin.companies.new' },
  },
  {
    path: 'companies/:id/edit',
    loadComponent: () =>
      import('./companies/tenant-company-form.component').then((m) => m.TenantCompanyFormComponent),
    data: { titleKey: 'admin.companies.edit' },
  },
  { path: 'billing', pathMatch: 'full', redirectTo: 'billing/subscriptions' },
  // Subscriptions & platform billing (staff). Short forms also open as dialogs from their lists.
  {
    path: 'billing/subscriptions',
    loadComponent: () => import('./billing/subscriptions/subscription-list.component').then((m) => m.SubscriptionListComponent),
    data: { titleKey: 'admin.billing.subscriptions.title' },
  },
  {
    path: 'billing/subscriptions/new',
    loadComponent: () => import('./billing/subscriptions/subscription-form.component').then((m) => m.SubscriptionFormComponent),
    data: { titleKey: 'admin.billing.subscriptions.new' },
  },
  {
    path: 'billing/subscriptions/:id/edit',
    loadComponent: () => import('./billing/subscriptions/subscription-form.component').then((m) => m.SubscriptionFormComponent),
    data: { titleKey: 'admin.billing.subscriptions.edit' },
  },
  {
    path: 'billing/plans',
    loadComponent: () => import('./billing/plans/plan-list.component').then((m) => m.PlanListComponent),
    data: { titleKey: 'admin.billing.plans.title' },
  },
  {
    path: 'billing/plans/new',
    loadComponent: () => import('./billing/plans/plan-form.component').then((m) => m.PlanFormComponent),
    data: { titleKey: 'admin.billing.plans.new' },
  },
  {
    path: 'billing/plans/:id/edit',
    loadComponent: () => import('./billing/plans/plan-form.component').then((m) => m.PlanFormComponent),
    data: { titleKey: 'admin.billing.plans.edit' },
  },
  {
    path: 'billing/modules',
    loadComponent: () => import('./billing/modules/module-list.component').then((m) => m.ModuleListComponent),
    data: { titleKey: 'admin.billing.modules.title' },
  },
  {
    path: 'billing/modules/new',
    loadComponent: () => import('./billing/modules/module-form.component').then((m) => m.ModuleFormComponent),
    data: { titleKey: 'admin.billing.modules.new' },
  },
  {
    path: 'billing/modules/:id/edit',
    loadComponent: () => import('./billing/modules/module-form.component').then((m) => m.ModuleFormComponent),
    data: { titleKey: 'admin.billing.modules.edit' },
  },
  {
    path: 'billing/invoices',
    loadComponent: () => import('./billing/invoices/invoice-list.component').then((m) => m.InvoiceListComponent),
    data: { titleKey: 'admin.billing.invoices.title' },
  },
  {
    path: 'billing/invoices/:id',
    loadComponent: () => import('./billing/invoices/invoice-detail.component').then((m) => m.InvoiceDetailComponent),
    data: { titleKey: 'admin.billing.invoices.detail' },
  },
  {
    path: 'billing/payments',
    loadComponent: () => import('./billing/payments/payment-list.component').then((m) => m.PaymentListComponent),
    data: { titleKey: 'admin.billing.payments.title' },
  },
  {
    path: 'billing/reports',
    loadComponent: () => import('./billing/reports/billing-reports.component').then((m) => m.BillingReportsComponent),
    data: { titleKey: 'admin.billing.reports.title' },
  },
];
