import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/auth/auth.guard';

/**
 * Lazy routes under /company. Each resource adds its list, new and edit routes below.
 * `data.permission` is checked by permissionGuard: view_ for the list, add_ for new, change_ for edit.
 */
export const COMPANY_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'users' },
  {
    path: 'departments',
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./departments/department-list.component').then((m) => m.DepartmentListComponent),
    data: { titleKey: 'company.departments.title', permission: 'view_department' },
  },
  {
    path: 'departments/new',
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./departments/department-form.component').then((m) => m.DepartmentFormComponent),
    data: { titleKey: 'company.departments.new', permission: 'add_department' },
  },
  {
    path: 'departments/:id/edit',
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./departments/department-form.component').then((m) => m.DepartmentFormComponent),
    data: { titleKey: 'company.departments.edit', permission: 'change_department' },
  },
  {
    path: 'permission-groups',
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./permission-groups/permission-group-list.component').then((m) => m.PermissionGroupListComponent),
    data: { titleKey: 'company.permissionGroups.title', permission: 'view_permissiongroup' },
  },
  {
    path: 'permission-groups/new',
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./permission-groups/permission-group-form.component').then((m) => m.PermissionGroupFormComponent),
    data: { titleKey: 'company.permissionGroups.new', permission: 'add_permissiongroup' },
  },
  {
    path: 'permission-groups/:id/edit',
    canActivate: [permissionGuard],
    loadComponent: () =>
      import('./permission-groups/permission-group-form.component').then((m) => m.PermissionGroupFormComponent),
    data: { titleKey: 'company.permissionGroups.edit', permission: 'change_permissiongroup' },
  },
  {
    path: 'permissions',
    canActivate: [permissionGuard],
    loadComponent: () => import('./permissions/permission-list.component').then((m) => m.PermissionListComponent),
    data: { titleKey: 'company.permissions.title', permission: 'view_permission' },
  },
  {
    path: 'permissions/new',
    canActivate: [permissionGuard],
    loadComponent: () => import('./permissions/permission-form.component').then((m) => m.PermissionFormComponent),
    data: { titleKey: 'company.permissions.new', permission: 'add_permission' },
  },
  {
    path: 'permissions/:id/edit',
    canActivate: [permissionGuard],
    loadComponent: () => import('./permissions/permission-form.component').then((m) => m.PermissionFormComponent),
    data: { titleKey: 'company.permissions.edit', permission: 'change_permission' },
  },
  {
    path: 'roles',
    canActivate: [permissionGuard],
    loadComponent: () => import('./roles/role-list.component').then((m) => m.RoleListComponent),
    data: { titleKey: 'company.roles.title', permission: 'view_role' },
  },
  {
    path: 'roles/new',
    canActivate: [permissionGuard],
    loadComponent: () => import('./roles/role-form.component').then((m) => m.RoleFormComponent),
    data: { titleKey: 'company.roles.new', permission: 'add_role' },
  },
  {
    path: 'roles/:id/edit',
    canActivate: [permissionGuard],
    loadComponent: () => import('./roles/role-form.component').then((m) => m.RoleFormComponent),
    data: { titleKey: 'company.roles.edit', permission: 'change_role' },
  },
  {
    path: 'teams',
    canActivate: [permissionGuard],
    loadComponent: () => import('./teams/team-list.component').then((m) => m.TeamListComponent),
    data: { titleKey: 'company.teams.title', permission: 'view_team' },
  },
  {
    path: 'teams/new',
    canActivate: [permissionGuard],
    loadComponent: () => import('./teams/team-form.component').then((m) => m.TeamFormComponent),
    data: { titleKey: 'company.teams.new', permission: 'add_team' },
  },
  {
    path: 'teams/:id/edit',
    canActivate: [permissionGuard],
    loadComponent: () => import('./teams/team-form.component').then((m) => m.TeamFormComponent),
    data: { titleKey: 'company.teams.edit', permission: 'change_team' },
  },
  {
    path: 'users',
    canActivate: [permissionGuard],
    loadComponent: () => import('./users/user-list.component').then((m) => m.UserListComponent),
    data: { titleKey: 'company.users.title', permission: 'view_companyuser' },
  },
  {
    path: 'users/new',
    canActivate: [permissionGuard],
    loadComponent: () => import('./users/user-form.component').then((m) => m.UserFormComponent),
    data: { titleKey: 'company.users.new', permission: 'add_companyuser' },
  },
  {
    path: 'users/:id/edit',
    canActivate: [permissionGuard],
    loadComponent: () => import('./users/user-form.component').then((m) => m.UserFormComponent),
    data: { titleKey: 'company.users.edit', permission: 'change_companyuser' },
  },
];
