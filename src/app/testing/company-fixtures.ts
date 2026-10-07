import {
  CompanyUser,
  Department,
  Permission,
  PermissionGroup,
  Role,
  Team,
  UserRef,
} from '../features/company/company.models';

export const SARA_REF: UserRef = {
  id: 9,
  email: 'sara@acme.example',
  first_name: 'Sara',
  last_name: 'Ali',
  date_joined: '2026-10-04T00:49:35+03:00',
  full_name: 'Sara Ali',
};

export function makeDepartment(overrides: Partial<Department> = {}): Department {
  return {
    id: 5,
    name_en: 'Sales',
    name_ar: 'المبيعات',
    parent: null,
    manager: null,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeRole(overrides: Partial<Role> = {}): Role {
  return { id: 3, name_en: 'Sales Manager', name_ar: null, is_admin: false, permission_groups: [], ...overrides };
}

export function makePermissionGroup(overrides: Partial<PermissionGroup> = {}): PermissionGroup {
  return {
    id: 4,
    name_en: 'Sales access',
    name_ar: null,
    description: '',
    is_core: false,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makePermission(overrides: Partial<Permission> = {}): Permission {
  return {
    id: 6,
    codename: 'sales.view',
    name: 'View sales',
    description: '',
    permission_type: 'API',
    groups: [],
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 7,
    name_en: 'B2B Team',
    name_ar: null,
    department: makeDepartment(),
    leads: [],
    location: { id: 1, name: 'Head Office (HQ-01)' },
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeCompanyUser(overrides: Partial<CompanyUser> = {}): CompanyUser {
  return {
    id: 12,
    user: {
      id: 9,
      email: 'sara@acme.example',
      first_name: 'Sara',
      last_name: 'Ali',
      preferred_name: '',
      profile_picture: null,
      phone_number: '',
      timezone: 'Asia/Riyadh',
    },
    role: null,
    department: null,
    team: null,
    is_company_admin: false,
    is_department_manager: false,
    is_team_lead: false,
    date_joined: '2026-10-04T00:49:35+03:00',
    last_updated: '2026-10-04T00:49:35+03:00',
    ...overrides,
  };
}
