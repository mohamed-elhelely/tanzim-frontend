import { Brand, Category, Product } from '../features/inventory/inventory.models';

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
