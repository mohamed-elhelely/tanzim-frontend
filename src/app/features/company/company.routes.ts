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
  {
    path: 'permissions',
    loadComponent: () => import('./permissions/permission-list.component').then((m) => m.PermissionListComponent),
    data: { titleKey: 'company.permissions.title' },
  },
  {
    path: 'permissions/new',
    loadComponent: () => import('./permissions/permission-form.component').then((m) => m.PermissionFormComponent),
    data: { titleKey: 'company.permissions.new' },
  },
  {
    path: 'permissions/:id/edit',
    loadComponent: () => import('./permissions/permission-form.component').then((m) => m.PermissionFormComponent),
    data: { titleKey: 'company.permissions.edit' },
  },
  {
    path: 'roles',
    loadComponent: () => import('./roles/role-list.component').then((m) => m.RoleListComponent),
    data: { titleKey: 'company.roles.title' },
  },
  {
    path: 'roles/new',
    loadComponent: () => import('./roles/role-form.component').then((m) => m.RoleFormComponent),
    data: { titleKey: 'company.roles.new' },
  },
  {
    path: 'roles/:id/edit',
    loadComponent: () => import('./roles/role-form.component').then((m) => m.RoleFormComponent),
    data: { titleKey: 'company.roles.edit' },
  },
  {
    path: 'teams',
    loadComponent: () => import('./teams/team-list.component').then((m) => m.TeamListComponent),
    data: { titleKey: 'company.teams.title' },
  },
  {
    path: 'teams/new',
    loadComponent: () => import('./teams/team-form.component').then((m) => m.TeamFormComponent),
    data: { titleKey: 'company.teams.new' },
  },
  {
    path: 'teams/:id/edit',
    loadComponent: () => import('./teams/team-form.component').then((m) => m.TeamFormComponent),
    data: { titleKey: 'company.teams.edit' },
  },
  {
    path: 'users',
    loadComponent: () => import('./users/user-list.component').then((m) => m.UserListComponent),
    data: { titleKey: 'company.users.title' },
  },
  {
    path: 'users/new',
    loadComponent: () => import('./users/user-form.component').then((m) => m.UserFormComponent),
    data: { titleKey: 'company.users.new' },
  },
  {
    path: 'users/:id/edit',
    loadComponent: () => import('./users/user-form.component').then((m) => m.UserFormComponent),
    data: { titleKey: 'company.users.edit' },
  },
];
