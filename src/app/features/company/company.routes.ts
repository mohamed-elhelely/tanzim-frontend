import { Routes } from '@angular/router';

/** Lazy routes under /company. Each resource adds its list, new and edit routes below. */
export const COMPANY_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'departments',
    loadComponent: () =>
      import('./departments/department-list.component').then((m) => m.DepartmentListComponent),
    data: { titleKey: 'company.departments.title' },
  },
  {
    path: 'departments/new',
    loadComponent: () =>
      import('./departments/department-form.component').then((m) => m.DepartmentFormComponent),
    data: { titleKey: 'company.departments.new' },
  },
  {
    path: 'departments/:id/edit',
    loadComponent: () =>
      import('./departments/department-form.component').then((m) => m.DepartmentFormComponent),
    data: { titleKey: 'company.departments.edit' },
  },
  {
    path: 'permission-groups',
    loadComponent: () =>
      import('./permission-groups/permission-group-list.component').then((m) => m.PermissionGroupListComponent),
    data: { titleKey: 'company.permissionGroups.title' },
  },
  {
    path: 'permission-groups/new',
    loadComponent: () =>
      import('./permission-groups/permission-group-form.component').then((m) => m.PermissionGroupFormComponent),
    data: { titleKey: 'company.permissionGroups.new' },
  },
  {
    path: 'permission-groups/:id/edit',
    loadComponent: () =>
      import('./permission-groups/permission-group-form.component').then((m) => m.PermissionGroupFormComponent),
    data: { titleKey: 'company.permissionGroups.edit' },
  },
];
