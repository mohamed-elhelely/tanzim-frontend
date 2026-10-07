/** Types for /api/company/v1/{country,region,city,district,location}/ (API_REFERENCE.md → "Locations"). */
import { UserRef } from '../company/company.models';

export interface Country {
  id: number;
  name_en: string;
  name_ar: string | null;
  iso_code: string;
  phone_code: string;
  is_active: boolean;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface Region {
  id: number;
  name_en: string;
  name_ar: string | null;
  code: string;
  country: Country;
  country_name: string;
  country_iso: string;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface City {
  id: number;
  name_en: string;
  name_ar: string | null;
  timezone: string;
  region: Region;
  region_name: string;
  country_name: string;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface District {
  id: number;
  name_en: string;
  name_ar: string | null;
  postal_code_prefix: string | null;
  city: City;
  city_name: string;
  region_name: string;
  created_by: UserRef | null;
  updated_by: UserRef | null;
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
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface CountryPayload {
  name_en: string;
  name_ar: string | null;
  iso_code: string;
  phone_code: string;
  is_active: boolean;
}

export interface RegionPayload {
  name_en: string;
  name_ar: string | null;
  /** Not nullable on the backend: send '' for "no code". */
  code: string;
  country: number;
}

export interface CityPayload {
  name_en: string;
  name_ar: string | null;
  timezone: string;
  region: number;
}

export interface DistrictPayload {
  name_en: string;
  name_ar: string | null;
  postal_code_prefix: string | null;
  city: number;
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
