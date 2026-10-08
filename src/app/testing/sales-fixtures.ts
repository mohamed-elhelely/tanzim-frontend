import { Customer, CustomerListItem, SalesOrder, SalesOrderLine, SalesOrderListItem } from '../features/sales/sales.models';

export function makeCustomerListItem(overrides: Partial<CustomerListItem> = {}): CustomerListItem {
  return {
    id: 1,
    customer_number: 'CUST-00001',
    name: 'Acme Trading',
    customer_type: 'business',
    email: 'buyer@acme.example',
    phone: '+966500000001',
    is_active: true,
    available_credit: '724.0000',
    ...overrides,
  };
}

export function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    ...makeCustomerListItem(),
    mobile: '',
    website: '',
    tax_id: '300000000000003',
    credit_limit: '1000.0000',
    credit_used: '276.0000',
    payment_terms: 'Net 30',
    currency: 'SAR',
    billing_address: { street: 'King Fahd Rd 12', city: 'Riyadh', country: 'Saudi Arabia' },
    shipping_address: { street: 'Warehouse St 3', city: 'Jeddah', country: 'Saudi Arabia' },
    notes: '',
    assigned_to: null,
    tags: [],
    created_at: '2026-10-08T22:00:00+03:00',
    updated_at: '2026-10-08T22:00:00+03:00',
    open_orders_count: 1,
    total_balance: '276.0000',
    ...overrides,
  };
}

export function makeOrderLine(overrides: Partial<SalesOrderLine> = {}): SalesOrderLine {
  return {
    id: 11,
    line_number: 1,
    product: 1,
    product_name: 'Phone X',
    variant: 1,
    sku: 'P1-1',
    description: 'Phone X',
    quantity_ordered: '2.000',
    quantity_reserved: '0.000',
    quantity_picked: '0.000',
    quantity_shipped: '0.000',
    unit_price: '100.0000',
    discount_percent: '10.00',
    tax_percent: '15.00',
    line_total: '180.0000',
    warehouse_bin: null,
    batch: null,
    serials: [],
    notes: '',
    ...overrides,
  };
}

export function makeOrderListItem(overrides: Partial<SalesOrderListItem> = {}): SalesOrderListItem {
  return {
    id: 1,
    order_number: 'SO-2026-00001',
    customer: 1,
    customer_name: 'Acme Trading',
    status: 'draft',
    warehouse: 1,
    warehouse_name: 'Main Warehouse',
    order_date: '2026-10-09',
    required_date: null,
    total_amount: '232.0000',
    currency: 'SAR',
    priority: 'normal',
    total_lines: 1,
    fulfillment_percent: 0,
    created_at: '2026-10-09T01:00:00+03:00',
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<SalesOrder> = {}): SalesOrder {
  const { total_lines: _ignored, ...base } = makeOrderListItem();
  return {
    ...base,
    customer_number: 'CUST-00001',
    shipped_date: null,
    shipping_address: { street: 'Warehouse St 3', city: 'Jeddah' },
    billing_address: { street: 'King Fahd Rd 12', city: 'Riyadh' },
    payment_terms: 'Net 30',
    subtotal: '180.0000',
    tax_amount: '27.0000',
    discount_amount: '0.0000',
    shipping_cost: '25.0000',
    reference: 'PO-77',
    approved_by: null,
    approved_at: null,
    cancelled_reason: '',
    tags: [],
    notes: '',
    internal_notes: '',
    lines: [makeOrderLine()],
    updated_at: '2026-10-09T01:00:00+03:00',
    ...overrides,
  };
}
