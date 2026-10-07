import { City, Country, District, Location, Region } from '../features/locations/locations.models';

export function makeCountry(overrides: Partial<Country> = {}): Country {
  return {
    id: 1,
    name_en: 'Egypt',
    name_ar: 'مصر',
    iso_code: 'EG',
    phone_code: '+20',
    is_active: true,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeRegion(overrides: Partial<Region> = {}): Region {
  const country = overrides.country ?? makeCountry();
  return {
    id: 2,
    name_en: 'Cairo Governorate',
    name_ar: 'محافظة القاهرة',
    code: 'CAI',
    country,
    country_name: country.name_en,
    country_iso: country.iso_code,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeCity(overrides: Partial<City> = {}): City {
  const region = overrides.region ?? makeRegion();
  return {
    id: 3,
    name_en: 'Cairo',
    name_ar: 'القاهرة',
    timezone: 'UTC',
    region,
    region_name: region.name_en,
    country_name: region.country.name_en,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeDistrict(overrides: Partial<District> = {}): District {
  const city = overrides.city ?? makeCity();
  return {
    id: 4,
    name_en: 'Nasr City',
    name_ar: 'مدينة نصر',
    postal_code_prefix: null,
    city,
    city_name: city.name_en,
    region_name: city.region.name_en,
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}

export function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 5,
    name_en: 'Head Office',
    name_ar: null,
    code: 'HQ-01',
    country: makeCountry(),
    region: makeRegion(),
    city: makeCity(),
    district: null,
    address_line1: '1 Nile St',
    address_line2: '',
    postal_code: null,
    is_active: true,
    location_type: 'office',
    created_by: null,
    updated_by: null,
    ...overrides,
  };
}
