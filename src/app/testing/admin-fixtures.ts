import { TenantCompany } from '../features/admin/admin.models';

export function makeTenantCompany(overrides: Partial<TenantCompany> = {}): TenantCompany {
  return {
    id: 1,
    name: 'Acme Trading',
    legal_name: 'Acme Trading LLC',
    domain: 'acme.example',
    tax_id: 'TX-100',
    is_active: true,
    email: 'info@acme.example',
    phone: '+966501234567',
    address: 'Riyadh',
    timezone: 'Asia/Riyadh',
    logo_url: null,
    primary_color: '#4f46e5',
    secondary_color: '#ffffff',
    created_at: '2026-10-04T00:49:34+03:00',
    updated_at: '2026-10-04T00:49:34+03:00',
    ...overrides,
  };
}
