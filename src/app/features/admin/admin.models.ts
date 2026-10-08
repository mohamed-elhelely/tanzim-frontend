/** Types for /api/company/v1/admin/company/ (API_REFERENCE.md → "Companies (platform admin)"). */

export interface TenantCompany {
  id: number;
  name: string;
  legal_name: string;
  domain: string;
  tax_id: string;
  is_active: boolean;
  email: string;
  phone: string;
  address: string;
  timezone: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  created_at: string;
  updated_at: string;
}

/** The logo is uploaded as multipart and is not handled by this screen yet. */
export interface TenantCompanyPayload {
  name: string;
  legal_name: string;
  domain: string;
  tax_id: string;
  is_active: boolean;
  email: string;
  phone: string;
  address: string;
  timezone: string;
  primary_color: string;
  secondary_color: string;
}
