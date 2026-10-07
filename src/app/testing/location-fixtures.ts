import { City, Country, District, Location, Region } from '../features/locations/location.models';

export const EGYPT: Country = {
  id: 1,
  name_en: 'Egypt',
  name_ar: 'مصر',
  iso_code: 'EG',
  phone_code: '+20',
  is_active: true,
};
export const SAUDI: Country = { ...EGYPT, id: 2, name_en: 'Saudi Arabia', name_ar: 'السعودية', iso_code: 'SA' };

export const CAIRO_REGION: Region = { id: 11, name_en: 'Cairo Governorate', name_ar: 'القاهرة', code: 'CAI', country: EGYPT };
export const RIYADH_REGION: Region = { id: 12, name_en: 'Riyadh Region', name_ar: 'الرياض', code: 'RYD', country: SAUDI };

export const CAIRO: City = { id: 21, name_en: 'Cairo', name_ar: 'القاهرة', timezone: 'UTC', region: CAIRO_REGION };
export const RIYADH: City = { id: 22, name_en: 'Riyadh', name_ar: 'الرياض', timezone: 'UTC', region: RIYADH_REGION };

export const NASR_CITY: District = { id: 31, name_en: 'Nasr City', name_ar: 'مدينة نصر', postal_code_prefix: '117', city: CAIRO };

export function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 4,
    name_en: 'Head Office',
    name_ar: 'المقر الرئيسي',
    code: 'HQ-01',
    country: EGYPT,
    region: CAIRO_REGION,
    city: CAIRO,
    district: NASR_CITY,
    address_line1: '12 Abbas El Akkad St',
    address_line2: '',
    postal_code: '11765',
    is_active: true,
    location_type: 'office',
    full_address: '12 Abbas El Akkad St, Nasr City, Cairo, Egypt',
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}
