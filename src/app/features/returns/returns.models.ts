/**
 * Types for the returns app (/api/returns/v1/…), checked against returns/serializers.py.
 * Like sales, it uses flat ids plus `*_name` fields and decimal strings.
 */

export type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

// Customer returns (RMA): requested → approved → received → inspected → closed.

export const CUSTOMER_RETURN_STATUSES = ['requested', 'approved', 'in_transit', 'received', 'inspected', 'closed', 'rejected'] as const;
export type CustomerReturnStatus = (typeof CUSTOMER_RETURN_STATUSES)[number];

export const RETURN_REASONS = ['defective', 'wrong_item', 'not_as_described', 'changed_mind', 'damaged_in_transit', 'other'] as const;
export type ReturnReason = (typeof RETURN_REASONS)[number];

export const REFUND_METHODS = ['refund', 'credit_note', 'replacement', 'exchange'] as const;
export type RefundMethod = (typeof REFUND_METHODS)[number];

export const CONDITIONS = ['new', 'good', 'fair', 'damaged', 'unsaleable'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const DISPOSITIONS = ['accept', 'quarantine', 'reject', 'return_to_supplier', 'warranty_repair'] as const;
export type Disposition = (typeof DISPOSITIONS)[number];

export type RestockingDecision = 'restock' | 'quarantine' | 'write_off' | 'return_to_supplier';

/**
 * The inspect endpoint wants both a disposition (what happens to the goods) and a restocking decision (stored for
 * reporting). The screen asks for the disposition only and derives the other one.
 */
export const RESTOCKING_FOR: Record<Disposition, RestockingDecision> = {
  accept: 'restock',
  quarantine: 'quarantine',
  reject: 'write_off',
  return_to_supplier: 'return_to_supplier',
  warranty_repair: 'quarantine',
};

export interface CustomerReturnListItem {
  id: number;
  return_number: string;
  customer: number;
  customer_name: string;
  warehouse: number;
  warehouse_name: string;
  status: CustomerReturnStatus;
  return_reason: ReturnReason;
  requested_date: string;
  refund_amount: string;
  total_lines: number;
  created_at: string;
}

export interface CustomerReturnLine {
  id: number;
  sales_order_line: number | null;
  sales_order_line_info: { line_number: number; quantity_ordered: number; unit_price: number } | null;
  product: number;
  product_name: string;
  quantity_requested: string;
  quantity_received: string;
  quantity_accepted: string;
  condition: Condition | '';
  rejection_reason: string;
  disposition: Disposition | null;
  defect_description: string;
  unit_price: string | null;
  line_value: string | null;
  notes: string;
}

export interface CustomerReturn extends CustomerReturnListItem {
  sales_order: number | null;
  sales_order_number: string | null;
  customer_number: string;
  return_reason_note: string;
  approved_date: string | null;
  received_date: string | null;
  inspected_date: string | null;
  closed_date: string | null;
  refund_method: RefundMethod | null;
  credit_note_number: string | null;
  replacement_order: number | null;
  total_items_received: string;
  total_items_accepted: string;
  total_items_quarantined: string;
  total_items_rejected: string;
  total_items_returned_to_supplier: string;
  total_return_value: string;
  lines: CustomerReturnLine[];
  updated_at: string;
}

export interface CustomerReturnLinePayload {
  sales_order_line: number | null;
  product: number;
  quantity_requested: string;
  defect_description: string;
  notes: string;
}

/** Created in one request with its lines; the backend has no nested update, so returns aren't edited. */
export interface CustomerReturnPayload {
  sales_order: number | null;
  customer: number;
  warehouse: number;
  return_reason: ReturnReason;
  return_reason_note: string;
  refund_method: RefundMethod | null;
  notes: string;
  lines: CustomerReturnLinePayload[];
}

export interface ReceiveLine {
  line_id: number;
  quantity_received: string;
}

export interface InspectLine {
  line_id: number;
  quantity_accepted: string;
  condition: Condition | '';
  disposition: Disposition;
  restocking_decision: RestockingDecision;
  rejection_reason: string;
  defect_description: string;
}

export const CUSTOMER_RETURN_SEVERITY: Record<CustomerReturnStatus, Severity> = {
  requested: 'secondary',
  approved: 'info',
  in_transit: 'warn',
  received: 'info',
  inspected: 'warn',
  closed: 'success',
  rejected: 'danger',
};

// Supplier returns: draft → approved → shipped → confirmed.

export const SUPPLIER_RETURN_STATUSES = ['draft', 'approved', 'shipped', 'confirmed', 'closed'] as const;
export type SupplierReturnStatus = (typeof SUPPLIER_RETURN_STATUSES)[number];

export interface SupplierReturnListItem {
  id: number;
  return_number: string;
  supplier: number;
  supplier_name: string;
  warehouse: number;
  warehouse_name: string;
  status: SupplierReturnStatus;
  shipped_date: string | null;
  refund_amount: string;
  created_at: string;
}

export interface SupplierReturnLine {
  id: number;
  product: number;
  product_name: string;
  quantity: string;
  unit_cost: string;
  line_total: string;
  notes: string;
}

export interface SupplierReturn extends SupplierReturnListItem {
  purchase_order: number | null;
  return_reason: string;
  confirmed_date: string | null;
  customer_return: number | null;
  customer_return_number: string | null;
  lines: SupplierReturnLine[];
  total_lines: number;
  updated_at: string;
}

export interface SupplierReturnPayload {
  supplier: number;
  warehouse: number;
  return_reason: string;
  lines: { product: number; quantity: string; unit_cost: string; notes: string }[];
}

export const SUPPLIER_RETURN_SEVERITY: Record<SupplierReturnStatus, Severity> = {
  draft: 'secondary',
  approved: 'info',
  shipped: 'warn',
  confirmed: 'success',
  closed: 'success',
};
