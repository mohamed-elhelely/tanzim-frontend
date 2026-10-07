export type AuthRole = 'ADMIN' | 'COMPANY' | 'EMPLOYEE';

export interface AuthUser {
  id: string;
  name: string | null;
  role: AuthRole;
  companyId: number | null;
  companyRole: string | null;
  isCompanyAdmin: boolean;
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
}

export interface RefreshResponse {
  access: string;
}

export interface AccessTokenPayload {
  user_id?: string | number;
  company_id?: number | null;
  company_role?: string | null;
  is_company_admin?: boolean;
  exp?: number;
}
