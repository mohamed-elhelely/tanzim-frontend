import { Bin, Brand, Category, Product, Supplier, Warehouse, Zone } from '../features/inventory/inventory.models';

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
    ...overrides,
  };
}

export function makeZone(overrides: Partial<Zone> = {}): Zone {
  return { id: 1, ...AUDIT, name: 'Zone A', warehouse: makeWarehouse(), is_active: true, ...overrides };
}

export function makeBin(overrides: Partial<Bin> = {}): Bin {
  return { id: 1, ...AUDIT, name: 'Bin 1', zone: makeZone(), is_active: true, allow_mixed_products: false, ...overrides };
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
    ...overrides,
  };
}
