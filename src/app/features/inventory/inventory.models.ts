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
  name: string;
  parent: number | null;
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

/** `?dropdown=true` items for warehouses, zones and bins. */
export interface CodedRef extends InventoryRef {
  code: string;
}

// Warehouses → zones → bins (API_REFERENCE.md → "Inventory — warehouses").

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
  code: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
}

export interface WarehousePayload {
  name: string;
  code: string;
  warehouse_type: WarehouseType;
  location: number | null;
  /** A user of the current company (the login user id). */
  manager: number | null;
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
  code: string;
  description: string;
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
  code: string;
  barcode: string;
  max_capacity: string | null;
  bin_type: string;
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
  reliability_score: number;
  notes: string;
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

// Product variants: the stock-keeping unit (API_REFERENCE.md → "Product variants").

/** `?dropdown=true` items for variants. */
export interface VariantRef {
  id: number;
  sku: string;
  name: string;
}

export interface ProductVariant extends Audited {
  product: Product;
  sku: string;
  name: string;
  barcode: string;
  /** Free-form attributes, e.g. `{ color: 'red', size: 'M' }`. */
  attributes: Record<string, string>;
  standard_cost: string | null;
  standard_price: string | null;
  weight: string | null;
  weight_uom: string;
  dimensions: unknown;
  is_active: boolean;
}

/** `dimensions` and `image` aren't edited here, so they're never sent (and never overwritten). */
export interface ProductVariantPayload {
  product: number | null;
  sku: string;
  name: string;
  barcode: string;
  attributes: Record<string, string>;
  standard_cost: string | null;
  standard_price: string | null;
  weight: string | null;
  weight_uom: string;
  is_active: boolean;
}

// Supplier products: a supplier's price list per variant (API_REFERENCE.md → "Supplier products").

export interface SupplierProduct extends Audited {
  supplier: Supplier;
  product_variant: ProductVariant | null;
  is_preferred: boolean;
  supplier_sku: string;
  supplier_product_name: string;
  unit_cost: string;
  currency: string;
  min_order_qty: string;
  max_order_qty: string | null;
  lead_time_days: number | null;
  is_primary: boolean;
  /** YYYY-MM-DD */
  effective_from: string;
  effective_to: string | null;
  notes: string;
}

export interface SupplierProductPayload {
  supplier: number | null;
  product_variant: number | null;
  supplier_sku: string;
  supplier_product_name: string;
  unit_cost: string;
  currency: string;
  min_order_qty: string;
  max_order_qty: string | null;
  lead_time_days: number | null;
  is_preferred: boolean;
  is_primary: boolean;
  /** YYYY-MM-DD */
  effective_from: string;
  effective_to: string | null;
  notes: string;
}

// Stock: levels from the inventory valuation report, movements from the stock ledger
// (API_REFERENCE.md → "Inventory — stock"; reports/v1 → inventory_valuation).

export const VALUATION_REPORT_METHODS = ['AVERAGE', 'FIFO', 'LIFO'] as const;
export type ValuationReportMethod = (typeof VALUATION_REPORT_METHODS)[number];

/** One variant's stock in the inventory_valuation report (numbers, not decimal strings). */
export interface StockLevelRow {
  variant_id: number;
  sku: string;
  product: string;
  quantity: number;
  unit_cost: number;
  total_value: number;
}

export interface StockValuation {
  report_type: 'inventory_valuation';
  method: ValuationReportMethod;
  columns: string[];
  rows: StockLevelRow[];
  summary: { total_quantity: number; total_value: number; items: number };
}

export const LEDGER_TRANSACTION_TYPES = [
  'receipt',
  'issue',
  'transfer_out',
  'transfer_in',
  'adjustment',
  'return',
  'write_off',
  'reservation',
  'reservation_release',
  'initial',
  'repair',
] as const;
export type LedgerTransactionType = (typeof LEDGER_TRANSACTION_TYPES)[number];

/** A ledger row: written by the inventory services, read-only in the API. Positive quantities come in. */
export interface StockLedgerEntry {
  id: number;
  created_at: string;
  created_by: UserRef | null;
  product_variant: VariantRef;
  warehouse: WarehouseRef;
  bin: { id: number; name: string; code: string } | null;
  batch: { id: number; batch_number: string } | null;
  serial_number: { id: number; serial_number: string } | null;
  transaction_type: LedgerTransactionType;
  quantity: string;
  unit_cost: string | null;
  total_cost: string | null;
  /** The source document's model name, e.g. "DeliveryNote"; `notes` names the document. */
  reference_type: string;
  reference_id: string | null;
  notes: string;
}

/** Stock held for a document (e.g. a confirmed sales order) until it ships or is released. */
export interface StockReservation {
  id: number;
  product_variant: VariantRef;
  warehouse: WarehouseRef;
  quantity: string;
  reference_type: string;
  is_released: boolean;
  reserved_at: string;
  expires_at: string | null;
}

export type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

export const LEDGER_TYPE_SEVERITY: Record<LedgerTransactionType, Severity> = {
  receipt: 'success',
  initial: 'success',
  transfer_in: 'info',
  return: 'info',
  issue: 'warn',
  transfer_out: 'warn',
  adjustment: 'secondary',
  reservation: 'secondary',
  reservation_release: 'secondary',
  repair: 'secondary',
  write_off: 'danger',
};

// Stock movements: transfers between warehouses and adjustments (API_REFERENCE.md → "Inventory — stock movements").
// Lines are their own resource, loaded with ?transfer= / ?adjustment=.

export interface WarehouseRef {
  id: number;
  name: string;
  code: string;
}

export const TRANSFER_STATUSES = ['draft', 'pending_approval', 'approved', 'in_transit', 'partial', 'received', 'cancelled'] as const;
export type TransferStatus = (typeof TRANSFER_STATUSES)[number];

export const TRANSFER_STATUS_SEVERITY: Record<TransferStatus, Severity> = {
  draft: 'secondary',
  pending_approval: 'warn',
  approved: 'info',
  in_transit: 'warn',
  partial: 'info',
  received: 'success',
  cancelled: 'danger',
};

export interface StockTransfer {
  id: number;
  transfer_number: string;
  status: TransferStatus;
  source_warehouse: WarehouseRef;
  destination_warehouse: WarehouseRef;
  requested_by: UserRef | null;
  /** YYYY-MM-DD */
  requested_date: string;
  expected_delivery_date: string | null;
  shipped_date: string | null;
  received_date: string | null;
  carrier: string;
  tracking_number: string;
  notes: string;
  created_at: string;
}

export interface StockTransferPayload {
  source_warehouse: number;
  destination_warehouse: number;
  expected_delivery_date: string | null;
  notes: string;
}

export interface StockTransferLine {
  id: number;
  product_variant: VariantRef;
  quantity_requested: string;
  quantity_shipped: string;
  quantity_received: string;
  notes: string;
}

export interface StockTransferLinePayload {
  transfer: number;
  product_variant: number;
  quantity_requested: string;
  notes: string;
}

/** Ship and receive take per-line quantities; without them the backend moves everything outstanding. */
export interface MovementQuantity {
  line_id: number;
  quantity: string;
}

/** Adjustments have no "rejected" status: rejecting sends them back to draft. */
export const ADJUSTMENT_STATUSES = ['draft', 'pending', 'approved', 'posted'] as const;
export type AdjustmentStatus = (typeof ADJUSTMENT_STATUSES)[number];

export const ADJUSTMENT_STATUS_SEVERITY: Record<AdjustmentStatus, Severity> = {
  draft: 'secondary',
  pending: 'warn',
  approved: 'info',
  posted: 'success',
};

export const ADJUSTMENT_REASONS = ['count', 'damage', 'expiry', 'return', 'sample', 'theft', 'correction', 'write_off'] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

export interface StockAdjustment {
  id: number;
  adjustment_number: string;
  status: AdjustmentStatus;
  reason: AdjustmentReason;
  warehouse: WarehouseRef;
  adjustment_date: string;
  created_by: UserRef | null;
  approved_by: UserRef | null;
  notes: string;
}

export interface StockAdjustmentPayload {
  warehouse: number;
  reason: AdjustmentReason;
  notes: string;
}

/** `difference` (new − current) and `total_cost` are computed by the backend. */
export interface StockAdjustmentLine {
  id: number;
  product_variant: VariantRef;
  current_quantity: string;
  new_quantity: string;
  difference: string;
  unit_cost: string | null;
  total_cost: string | null;
  notes: string;
}

export interface StockAdjustmentLinePayload {
  adjustment: number;
  product_variant: number;
  current_quantity: string;
  new_quantity: string;
  unit_cost: string | null;
  notes: string;
}
