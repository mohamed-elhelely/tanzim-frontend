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

export type PermissionType = 'API' | 'OBJECT' | 'FEATURE';

/** A permission inside a role or group response. */
export interface PermissionSummary {
  id: number;
  codename: string;
  name: string;
  permission_type: PermissionType;
}

/** GET /permissions/?dropdown=true. */
export interface PermissionOption {
  id: number;
  name: string;
  codename: string;
}

export interface Role {
  id: number;
  name_en: string;
  name_ar: string | null;
  is_admin: boolean;
  permission_groups: NamedRef[];
  /** Single permissions granted on top of the groups. */
  permissions: PermissionSummary[];
}

export interface PermissionGroup {
  id: number;
  name_en: string;
  name_ar: string | null;
  description: string;
  /** System group (Full Access, Read Only, per-module ones): read-only, PATCH/DELETE answer 403. */
  is_core: boolean;
  permissions: PermissionSummary[];
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

/** GET /permission-groups/?dropdown=true. */
export interface PermissionGroupOption extends NamedRef {
  is_core: boolean;
}

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

/** POST /company-user/ response: shorter than CompanyUser and without an id (API_REFERENCE, verified). */
export interface CompanyUserCreated {
  user: { email: string; first_name: string; last_name: string; preferred_name?: string; phone_number?: string };
  role?: number | null;
  department?: number | null;
  team?: number | null;
  is_company_admin?: boolean;
  is_department_manager?: boolean;
  is_team_lead?: boolean;
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
  permission_groups?: number[];
  /** Replaces the role's single permissions on update. */
  permissions?: number[];
  is_admin?: boolean;
}

export interface PermissionGroupPayload {
  name_en: string;
  name_ar?: string | null;
  description?: string;
  /** Replaces the group's permissions on update. */
  permissions?: number[];
}

/** GET/PATCH /company-profile/: the company's branding. */
export interface CompanyProfile {
  id: number;
  name: string;
  /** Absolute URL or null. */
  logo: string | null;
  /** `#RRGGBB`. */
  primary_color: string;
  secondary_color: string;
}

export interface PermissionPayload {
  codename: string;
  name: string;
  description?: string;
  permission_type?: PermissionType;
  groups?: number[];
}
