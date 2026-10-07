/** Types for /api/company/v1/… (API_REFERENCE.md → "Company & organisation"). */

export interface UserRef {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  date_joined: string;
  full_name?: string;
}

export interface NamedRef {
  id: number;
  name_en: string;
  name_ar?: string | null;
}

export interface SelectOption {
  value: number;
  label: string;
}

export interface Department {
  id: number;
  name_en: string;
  name_ar: string | null;
  parent: NamedRef | null;
  manager: UserRef | null;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface Team {
  id: number;
  name_en: string;
  name_ar: string | null;
  department: Department;
  leads: UserRef[];
  location: { id: number; name: string } | null;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface Role {
  id: number;
  name_en: string;
  name_ar: string | null;
  is_admin: boolean;
  permission_groups: NamedRef[];
}

export interface PermissionGroup {
  id: number;
  name_en: string;
  name_ar: string | null;
  description: string;
  is_core: boolean;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export type PermissionType = 'API' | 'OBJECT' | 'FEATURE';

export interface Permission {
  id: number;
  codename: string;
  name: string;
  description: string;
  permission_type: PermissionType;
  groups: NamedRef[];
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface CompanyUser {
  id: number;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    preferred_name: string;
    profile_picture: string | null;
    phone_number: string;
    timezone: string;
  };
  role: Role | null;
  department: Department | null;
  team: Team | null;
  is_company_admin: boolean;
  is_department_manager: boolean;
  is_team_lead: boolean;
  date_joined: string;
  last_updated: string;
}

export interface CompanyUserPayload {
  user: {
    email: string;
    first_name: string;
    last_name: string;
    preferred_name?: string;
    phone_number?: string;
    password?: string;
  };
  role?: number | null;
  department?: number | null;
  team?: number | null;
  is_company_admin?: boolean;
  is_department_manager?: boolean;
  is_team_lead?: boolean;
}

export interface DepartmentPayload {
  name_en: string;
  name_ar?: string | null;
  parent?: number | null;
  manager?: number | null;
}

export interface TeamPayload {
  department: number;
  name_en: string;
  name_ar?: string | null;
  leads?: number[];
  location: number;
}

export interface RolePayload {
  name_en: string;
  name_ar?: string | null;
  permission_groups: number[];
  is_admin?: boolean;
}

export interface PermissionGroupPayload {
  name_en: string;
  name_ar?: string | null;
  description?: string;
  is_core?: boolean;
}

export interface PermissionPayload {
  codename: string;
  name: string;
  description?: string;
  permission_type?: PermissionType;
  groups?: number[];
}
