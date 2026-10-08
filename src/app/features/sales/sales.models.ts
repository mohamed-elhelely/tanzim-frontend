/**
 * Types for the sales app (/api/sales/…), checked against sales/serializers.py.
 * Sales endpoints use flat ids plus `*_name` fields instead of nested objects, and money as decimal strings.
 */

export const CUSTOMER_TYPES = ['individual', 'business', 'government'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

/** The backend stores addresses as free JSON; this is the shape its own fixtures use. */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

/** List item (CustomerListSerializer). */
export interface CustomerListItem {
  id: number;
  customer_number: string;
  name: string;
  customer_type: CustomerType;
  email: string;
  phone: string;
  is_active: boolean;
  available_credit: string | null;
}

/** Retrieve (CustomerDetailSerializer). */
export interface Customer extends CustomerListItem {
  mobile: string;
  website: string;
  tax_id: string;
  credit_limit: string | null;
  credit_used: string;
  payment_terms: string;
  currency: string;
  billing_address: Address;
  shipping_address: Address;
  notes: string;
  assigned_to: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  open_orders_count: number;
  total_balance: string;
}

/** `credit_used` is maintained by the backend (orders and payments), so it's never sent. */
export interface CustomerPayload {
  name: string;
  customer_type: CustomerType;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  tax_id: string;
  credit_limit: string | null;
  payment_terms: string;
  currency: string;
  billing_address: Address;
  shipping_address: Address;
  is_active: boolean;
  notes: string;
}

export const SALES_ORDER_STATUSES = ['draft', 'confirmed', 'picking', 'shipped', 'delivered', 'cancelled', 'on_hold'] as const;
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number];

export const ORDER_PRIORITIES = ['normal', 'high', 'urgent'] as const;
export type OrderPriority = (typeof ORDER_PRIORITIES)[number];

/** List item (SalesOrderListSerializer). */
export interface SalesOrderListItem {
  id: number;
  order_number: string;
  customer: number;
  customer_name: string;
  status: SalesOrderStatus;
  warehouse: number;
  warehouse_name: string;
  order_date: string;
  required_date: string | null;
  total_amount: string;
  currency: string;
  priority: OrderPriority;
  total_lines: number;
  fulfillment_percent: number;
  created_at: string;
}

export interface SalesOrderLine {
  id: number;
  line_number: number;
  product: number;
  product_name: string;
  variant: number | null;
  sku: string | null;
  description: string;
  quantity_ordered: string;
  quantity_reserved: string;
  quantity_picked: string;
  quantity_shipped: string;
  unit_price: string;
  discount_percent: string;
  tax_percent: string;
  line_total: string;
  warehouse_bin: number | null;
  batch: number | null;
  serials: number[];
  notes: string;
}

/** Retrieve (SalesOrderSerializer). */
export interface SalesOrder extends Omit<SalesOrderListItem, 'total_lines'> {
  customer_number: string;
  shipped_date: string | null;
  shipping_address: Address;
  billing_address: Address;
  payment_terms: string;
  subtotal: string;
  tax_amount: string;
  discount_amount: string;
  shipping_cost: string;
  reference: string;
  approved_by: number | null;
  approved_at: string | null;
  cancelled_reason: string;
  tags: string[];
  notes: string;
  internal_notes: string;
  lines: SalesOrderLine[];
  updated_at: string;
}

export interface SalesOrderLinePayload {
  product: number;
  variant: number | null;
  description: string;
  quantity_ordered: string;
  unit_price: string;
  discount_percent: string;
  tax_percent: string;
  notes: string;
}

/** Saving with `lines` replaces every line of the order (SalesOrderWriteSerializer.update). */
export interface SalesOrderPayload {
  customer: number;
  warehouse: number;
  required_date: string | null;
  shipping_address: Address;
  billing_address: Address;
  payment_terms: string;
  currency: string;
  discount_amount: string;
  shipping_cost: string;
  reference: string;
  priority: OrderPriority;
  notes: string;
  internal_notes: string;
  lines: SalesOrderLinePayload[];
}

/** The create/update response (SalesOrderWriteSerializer): no names or totals, so screens re-fetch. */
export interface SalesOrderSaved {
  id: number;
  order_number: string;
  status: SalesOrderStatus;
}

/** Line and order totals exactly as the backend computes them (SalesOrderLine.save, SalesOrder.calculate_totals). */
export function lineTotal(quantity: number, unitPrice: number, discountPercent: number): number {
  return quantity * unitPrice * (1 - discountPercent / 100);
}

export function lineTax(total: number, taxPercent: number): number {
  return (total * taxPercent) / 100;
}

export type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

export const ORDER_STATUS_SEVERITY: Record<SalesOrderStatus, Severity> = {
  draft: 'secondary',
  confirmed: 'info',
  picking: 'info',
  shipped: 'warn',
  delivered: 'success',
  cancelled: 'danger',
  on_hold: 'warn',
};

export const PRIORITY_SEVERITY: Record<OrderPriority, Severity> = {
  normal: 'secondary',
  high: 'warn',
  urgent: 'danger',
};
