/** Types for /api/company/v1/{country,region,city,district,location}/ (API_REFERENCE.md → "Locations"). */
import { UserRef } from '../company/company.models';

export interface Country {
  id: number;
  name_en: string;
  name_ar: string | null;
  iso_code: string;
  phone_code: string;
  is_active: boolean;
}

export interface Region {
  id: number;
  name_en: string;
  name_ar: string | null;
  code: string | null;
  country: Country;
}

export interface City {
  id: number;
  name_en: string;
  name_ar: string | null;
  timezone: string;
  region: Region;
}

export interface District {
  id: number;
  name_en: string;
  name_ar: string | null;
  postal_code_prefix: string | null;
  city: City;
}

export const LOCATION_TYPES = ['office', 'warehouse', 'retail', 'factory', 'remote'] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export interface Location {
  id: number;
  name_en: string;
  name_ar: string | null;
  code: string | null;
  country: Country;
  region: Region;
  city: City;
  district: District | null;
  address_line1: string;
  address_line2: string;
  postal_code: string | null;
  is_active: boolean;
  location_type: LocationType;
  /** Omitted by the backend when empty. */
  full_address?: string;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface LocationPayload {
  name_en: string;
  name_ar: string | null;
  code: string | null;
  country: number;
  region: number;
  city: number;
  district: number | null;
  address_line1: string;
  address_line2: string;
  postal_code: string | null;
  is_active: boolean;
  location_type: LocationType;
}
