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

// Delivery notes (sales/serializers.py → DeliveryNote*Serializer).

export const DELIVERY_STATUSES = ['draft', 'confirmed', 'in_transit', 'delivered', 'failed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export const SHIPPING_METHODS = ['standard', 'express', 'overnight', 'pickup'] as const;
export type ShippingMethod = (typeof SHIPPING_METHODS)[number];

export interface DeliveryNoteListItem {
  id: number;
  sales_order: number;
  sales_order_number: string;
  customer_name: string;
  delivery_number: string;
  status: DeliveryStatus;
  warehouse: number;
  warehouse_name: string;
  shipped_date: string | null;
  delivered_date: string | null;
  carrier: string;
  tracking_number: string;
  shipping_method: ShippingMethod;
  created_at: string;
}

export interface DeliveryNoteLine {
  id: number;
  sales_order_line: number;
  product: number;
  product_name: string;
  sku: string | null;
  quantity_delivered: string;
  batch: number | null;
  bin: number | null;
  serials: number[];
}

export interface DeliveryNote extends DeliveryNoteListItem {
  notes: string;
  created_by: number | null;
  created_by_name: string | null;
  lines: DeliveryNoteLine[];
  updated_at: string;
}

/** The fields a delivery note's PATCH accepts besides its order and lines. */
export interface DeliveryNoteDetailsPayload {
  shipping_method: ShippingMethod;
  carrier: string;
  tracking_number: string;
  notes: string;
}

/** POST sales-orders/{id}/create_delivery/: stock is issued as soon as the note is created. */
export interface CreateDeliveryPayload {
  lines: { line_id: number; quantity: string }[];
  carrier: string;
  tracking_number: string;
}

export const DELIVERY_STATUS_SEVERITY: Record<DeliveryStatus, Severity> = {
  draft: 'secondary',
  confirmed: 'info',
  in_transit: 'warn',
  delivered: 'success',
  failed: 'danger',
};

// Sales invoices and payments.

export const INVOICE_STATUSES = ['draft', 'issued', 'paid', 'overdue', 'cancelled'] as const;
export type SalesInvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const PAYMENT_STATUSES = ['pending', 'partial', 'paid', 'overpaid', 'failed'] as const;
export type InvoicePaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface SalesInvoiceListItem {
  id: number;
  invoice_number: string;
  sales_order: number;
  sales_order_number: string;
  delivery_note: number | null;
  delivery_note_number: string | null;
  status: SalesInvoiceStatus;
  payment_status: InvoicePaymentStatus;
  invoice_date: string;
  due_date: string | null;
  customer: number;
  customer_name: string;
  currency: string;
  total_amount: string;
  amount_paid: string;
  amount_due: string;
  payment_percentage: number;
  created_at: string;
}

export interface SalesInvoiceLine {
  id: number;
  line_number: number;
  product: number;
  product_name: string;
  variant: number | null;
  sku: string | null;
  description: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_percent: string;
  line_total: string;
}

export interface SalesInvoice extends SalesInvoiceListItem {
  subtotal: string;
  tax_amount: string;
  /** Carried over from the order. */
  shipping_cost: string;
  discount_amount: string;
  reference: string;
  notes: string;
  payment_terms: string;
  issued_by_name: string | null;
  paid_by_name: string | null;
  paid_at: string | null;
  cancelled_at: string | null;
  cancelled_reason: string;
  created_by_name: string | null;
  lines: SalesInvoiceLine[];
  updated_at: string;
}

/** Editable while the invoice is a draft (SalesInvoiceWriteSerializer, without lines). */
export interface SalesInvoiceDetailsPayload {
  due_date: string | null;
  reference: string;
  payment_terms: string;
  notes: string;
}

export const PAYMENT_METHODS = ['bank_transfer', 'cash', 'credit_card', 'check', 'other'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export type PaymentRecordStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface InvoicePayment {
  id: number;
  invoice: number;
  invoice_number: string;
  payment_date: string;
  amount: string;
  payment_method: PaymentMethod;
  reference: string;
  notes: string;
  created_by_name: string | null;
  status: PaymentRecordStatus;
  created_at: string;
}

export interface PaymentPayload {
  amount: string;
  payment_method: PaymentMethod;
  payment_date: string;
  reference: string;
  notes: string;
}

export const INVOICE_STATUS_SEVERITY: Record<SalesInvoiceStatus, Severity> = {
  draft: 'secondary',
  issued: 'info',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'secondary',
};

export const PAYMENT_STATUS_SEVERITY: Record<InvoicePaymentStatus, Severity> = {
  pending: 'warn',
  partial: 'info',
  paid: 'success',
  overpaid: 'warn',
  failed: 'danger',
};

export const PAYMENT_RECORD_SEVERITY: Record<PaymentRecordStatus, Severity> = {
  pending: 'warn',
  completed: 'success',
  failed: 'danger',
  refunded: 'secondary',
};
