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
  /** This device's session (`id` in the signed-in devices list). */
  session_id?: string;
  /** Access token lifetime in seconds (30 minutes). */
  expires_in?: number;
  /** Refresh token lifetime in seconds (7 days). */
  refresh_expires_in?: number;
}

/** POST /api/refresh/: both tokens rotate; the refresh token that was sent is spent. */
export interface RefreshResponse {
  access: string;
  refresh: string;
  expires_in?: number;
  refresh_expires_in?: number;
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
  user: { id: number; email: string; first_name: string; last_name: string; profile_picture: string | null };
  is_staff: boolean;
  /** Branding: `logo` is an absolute URL, colors are `#RRGGBB`. */
  company: { id: number; name: string; logo: string | null; primary_color: string; secondary_color: string } | null;
  role: { id: number; name_en: string; name_ar: string | null; is_admin: boolean } | null;
  is_company_admin: boolean;
  is_department_manager: boolean;
  is_team_lead: boolean;
  /** Company admins and admin roles: every permission counts as granted. */
  has_full_access: boolean;
  /** Codenames like `view_department`, `add_team`, and module feature permissions like `access_sales`. */
  permissions: string[];
  /** Module codes of the company's active subscription, e.g. `inventory`, `location`. */
  modules: string[];
}
