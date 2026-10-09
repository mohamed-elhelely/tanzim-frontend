import {
  Bin,
  Brand,
  Category,
  Product,
  ProductVariant,
  Supplier,
  SupplierProduct,
  Warehouse,
  Zone,
} from '../features/inventory/inventory.models';

const AUDIT = {
  created_at: '2026-10-08T17:40:02+03:00',
  updated_at: '2026-10-08T17:40:02+03:00',
  created_by: null,
  updated_by: null,
};

export function makeCategory(overrides: Partial<Category> = {}): Category {
  return { id: 1, ...AUDIT, name: 'Electronics', parent: null, description: '', is_active: true, ...overrides };
}

export function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return { id: 1, ...AUDIT, name: 'Acme', description: 'Gadgets', logo: null, is_active: true, ...overrides };
}

export function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    ...AUDIT,
    name: 'Phone X',
    description: '',
    product_type: 'simple',
    category: makeCategory({ id: 2, name: 'Phones', parent: makeCategory() }),
    brand: makeBrand(),
    default_uom: 'each',
    is_batch_tracked: false,
    is_serial_tracked: true,
    has_expiry: false,
    shelf_life_days: null,
    valuation_method: 'average',
    image: null,
    additional_images: [],
    is_active: true,
    is_purchasable: true,
    is_sellable: true,
    ...overrides,
  };
}

export function makeWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: 1,
    ...AUDIT,
    name: 'Main WH',
    warehouse_type: 'central',
    location: { id: 1, name_en: 'Head office', name_ar: 'المقر' },
    manager: null,
    is_active: true,
    allow_negative_stock: false,
    use_bin_locations: true,
    code: 'MAIN',
    email: 'wh@acme.test',
    phone: '0100',
    address_line1: '1 Nile St',
    address_line2: '',
    city: 'Cairo',
    state: '',
    postal_code: '',
    country: 'Egypt',
    ...overrides,
  };
}

export function makeZone(overrides: Partial<Zone> = {}): Zone {
  return {
    id: 1,
    ...AUDIT,
    name: 'Zone A',
    warehouse: makeWarehouse(),
    is_active: true,
    code: 'ZA',
    description: 'Fast movers',
    ...overrides,
  };
}

export function makeBin(overrides: Partial<Bin> = {}): Bin {
  return {
    id: 1,
    ...AUDIT,
    name: 'Bin 1',
    zone: makeZone(),
    is_active: true,
    allow_mixed_products: false,
    code: 'B1',
    barcode: '123',
    max_capacity: '100.000',
    bin_type: 'shelf',
    ...overrides,
  };
}

export function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 1,
    ...AUDIT,
    name: 'Gulf Supply',
    supplier_type: 'distributor',
    is_active: true,
    is_preferred: true,
    lead_time_days: 7,
    credit_limit: '5000.00',
    tax_id: 'TX-1',
    contact_person: 'Omar',
    email: 'sales@gulf.test',
    phone: '0101',
    mobile: '',
    website: '',
    address_line1: '',
    address_line2: '',
    city: 'Dubai',
    state: '',
    postal_code: '',
    country: 'UAE',
    payment_terms: 'Net 30',
    currency: 'AED',
    reliability_score: 0.9,
    notes: '',
    ...overrides,
  };
}

export function makeVariant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: 1,
    ...AUDIT,
    product: makeProduct(),
    sku: 'PX-RED-128',
    name: 'Phone X Red 128',
    barcode: '111',
    attributes: { color: 'red', storage: '128GB' },
    standard_cost: '500.0000',
    standard_price: '799.9900',
    weight: '0.200',
    weight_uom: 'kg',
    dimensions: {},
    is_active: true,
    ...overrides,
  };
}

export function makeSupplierProduct(overrides: Partial<SupplierProduct> = {}): SupplierProduct {
  return {
    id: 1,
    ...AUDIT,
    supplier: makeSupplier(),
    product_variant: makeVariant(),
    is_preferred: true,
    supplier_sku: 'GS-1',
    supplier_product_name: 'Phone X red',
    unit_cost: '480.0000',
    currency: 'AED',
    min_order_qty: '1.000',
    max_order_qty: null,
    lead_time_days: 5,
    is_primary: true,
    effective_from: '2026-01-01',
    effective_to: null,
    notes: '',
    ...overrides,
  };
}
