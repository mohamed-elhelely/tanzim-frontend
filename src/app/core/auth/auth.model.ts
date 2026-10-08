/** Login role from POST /api/login/ (see AuthService). */
export type AuthRole = 'ADMIN' | 'COMPANY' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  name: string | null;
  role: AuthRole;
  companyId: number | null;
  companyRole: string | null;
  isCompanyAdmin: boolean;
  /** Platform staff: may use the Companies screens. `role: 'ADMIN'` alone only means "no company". */
  isStaff: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: string;
  role: AuthRole;
  is_staff?: boolean;
}

export interface RefreshResponse {
  access: string;
}

export interface AccessTokenPayload {
  user_id?: string | number;
  company_id?: number | null;
  company_role?: string | null;
  is_company_admin?: boolean;
  is_staff?: boolean;
  exp?: number;
}

/** GET /api/company/v1/me/: everything the UI needs to decide what to show. */
export interface CurrentUser {
  user: { id: number; email: string; first_name: string; last_name: string };
  is_staff: boolean;
  company: { id: number; name: string } | null;
  role: { id: number; name_en: string; name_ar: string | null; is_admin: boolean } | null;
  is_company_admin: boolean;
  is_department_manager: boolean;
  is_team_lead: boolean;
  /** Company admins and admin roles: every permission counts as granted. */
  has_full_access: boolean;
  /** Codenames like `view_department`, `add_team` (only the company resources are permission-gated). */
  permissions: string[];
  /** Module codes of the company's active subscription, e.g. `inventory`, `location`. */
  modules: string[];
}
