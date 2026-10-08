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
];
