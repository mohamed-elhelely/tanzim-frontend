/** Types for /api/inventory/v1/… catalogue (API_REFERENCE.md → "Inventory — catalogue"). */
import { UserRef } from '../company/company.models';

/** `?dropdown=true` items for categories, brands and products. */
export interface InventoryRef {
  id: number;
  name: string;
}

interface Audited {
  id: number;
  created_at: string;
  updated_at: string;
  created_by: UserRef | null;
  updated_by: UserRef | null;
}

export interface Category extends Audited {
  name: string;
  /** The full parent category (itself with a nested parent), or null at the top level. */
  parent: Category | null;
  description: string;
  is_active: boolean;
}

export interface CategoryPayload {
  name?: string;
  parent?: number | null;
  description: string;
  is_active: boolean;
}

export interface Brand extends Audited {
  name: string;
  description: string;
  logo: string | null;
  is_active: boolean;
}

/** Logo upload (multipart) is not handled yet. */
export interface BrandPayload {
  name: string;
  description: string;
  is_active: boolean;
}

export type ProductType = 'simple' | 'variant' | 'bundle' | 'service';
export type ValuationMethod = 'fifo' | 'lifo' | 'average';

export const PRODUCT_TYPES: ProductType[] = ['simple', 'variant', 'bundle', 'service'];
export const VALUATION_METHODS: ValuationMethod[] = ['average', 'fifo', 'lifo'];

export interface Product extends Audited {
  name: string;
  description: string;
  product_type: ProductType;
  category: Category | null;
  brand: Brand | null;
  default_uom: string;
  is_batch_tracked: boolean;
  is_serial_tracked: boolean;
  has_expiry: boolean;
  shelf_life_days: number | null;
  valuation_method: ValuationMethod;
  image: string | null;
  additional_images: unknown;
  is_active: boolean;
  is_purchasable: boolean;
  is_sellable: boolean;
}

/** Image uploads (multipart) are not handled yet. */
export interface ProductPayload {
  name: string;
  description: string;
  product_type: ProductType;
  category: number | null;
  brand: number | null;
  default_uom: string;
  is_batch_tracked: boolean;
  is_serial_tracked: boolean;
  has_expiry: boolean;
  shelf_life_days: number | null;
  valuation_method: ValuationMethod;
  is_active: boolean;
  is_purchasable: boolean;
  is_sellable: boolean;
}

/** `?dropdown=true` items for warehouses, zones and bins: the only place their `code` is returned. */
export interface CodedRef extends InventoryRef {
  code: string;
}

// Warehouses → zones → bins (API_REFERENCE.md → "Inventory — warehouses").
// ⚠️ The read endpoints return only some fields (no code, contact or address); see omitPristine().

export type WarehouseType = 'central' | 'regional' | 'retail' | 'transit' | 'returns' | 'quarantine';
export const WAREHOUSE_TYPES: WarehouseType[] = ['central', 'regional', 'retail', 'transit', 'returns', 'quarantine'];

export interface Warehouse extends Audited {
  name: string;
  warehouse_type: WarehouseType;
  location: { id: number; name_en: string; name_ar: string | null } | null;
  manager: UserRef | null;
  is_active: boolean;
  allow_negative_stock: boolean;
  use_bin_locations: boolean;
}

/** `manager` is left out: the backend answers 500 whenever it is sent (BACKEND_REQUESTS 15d). */
export interface WarehousePayload {
  name: string;
  code: string;
  warehouse_type: WarehouseType;
  location: number | null;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_active: boolean;
  allow_negative_stock: boolean;
  use_bin_locations: boolean;
}

export interface Zone extends Audited {
  name: string;
  warehouse: Warehouse;
  is_active: boolean;
}

export interface ZonePayload {
  warehouse: number | null;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export interface Bin extends Audited {
  name: string;
  zone: Zone;
  is_active: boolean;
  allow_mixed_products: boolean;
}

export interface BinPayload {
  zone: number | null;
  name: string;
  code: string;
  barcode: string;
  max_capacity: string | null;
  bin_type: string;
  is_active: boolean;
  allow_mixed_products: boolean;
}

// Suppliers (API_REFERENCE.md → "Inventory — suppliers").

export type SupplierType = 'manufacturer' | 'distributor' | 'wholesaler' | 'retailer' | 'service';
export const SUPPLIER_TYPES: SupplierType[] = ['manufacturer', 'distributor', 'wholesaler', 'retailer', 'service'];

export interface Supplier extends Audited {
  name: string;
  supplier_type: SupplierType;
  is_active: boolean;
  is_preferred: boolean;
  lead_time_days: number;
  credit_limit: string | null;
}

export interface SupplierPayload {
  name: string;
  supplier_type: SupplierType;
  tax_id: string;
  contact_person: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  payment_terms: string;
  currency: string;
  credit_limit: string | null;
  lead_time_days: number;
  /** 0–1, not a 5-star rating. */
  reliability_score: number;
  is_preferred: boolean;
  is_active: boolean;
  notes: string;
}
