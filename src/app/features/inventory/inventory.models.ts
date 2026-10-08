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
