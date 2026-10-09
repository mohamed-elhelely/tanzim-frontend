import { Routes } from '@angular/router';

/** Lazy routes under /inventory. Each resource adds its list, new and edit routes below. */
export const INVENTORY_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'products' },
  {
    path: 'products',
    loadComponent: () => import('./products/product-list.component').then((m) => m.ProductListComponent),
    data: { titleKey: 'inventory.products.title' },
  },
  {
    path: 'products/new',
    loadComponent: () => import('./products/product-form.component').then((m) => m.ProductFormComponent),
    data: { titleKey: 'inventory.products.new' },
  },
  {
    path: 'products/:id/edit',
    loadComponent: () => import('./products/product-form.component').then((m) => m.ProductFormComponent),
    data: { titleKey: 'inventory.products.edit' },
  },
  {
    path: 'categories',
    loadComponent: () => import('./categories/category-list.component').then((m) => m.CategoryListComponent),
    data: { titleKey: 'inventory.categories.title' },
  },
  {
    path: 'categories/new',
    loadComponent: () => import('./categories/category-form.component').then((m) => m.CategoryFormComponent),
    data: { titleKey: 'inventory.categories.new' },
  },
  {
    path: 'categories/:id/edit',
    loadComponent: () => import('./categories/category-form.component').then((m) => m.CategoryFormComponent),
    data: { titleKey: 'inventory.categories.edit' },
  },
  {
    path: 'brands',
    loadComponent: () => import('./brands/brand-list.component').then((m) => m.BrandListComponent),
    data: { titleKey: 'inventory.brands.title' },
  },
  {
    path: 'brands/new',
    loadComponent: () => import('./brands/brand-form.component').then((m) => m.BrandFormComponent),
    data: { titleKey: 'inventory.brands.new' },
  },
  {
    path: 'brands/:id/edit',
    loadComponent: () => import('./brands/brand-form.component').then((m) => m.BrandFormComponent),
    data: { titleKey: 'inventory.brands.edit' },
  },
  {
    path: 'warehouses',
    loadComponent: () => import('./warehouses/warehouse-list.component').then((m) => m.WarehouseListComponent),
    data: { titleKey: 'inventory.warehouses.title' },
  },
  {
    path: 'warehouses/new',
    loadComponent: () => import('./warehouses/warehouse-form.component').then((m) => m.WarehouseFormComponent),
    data: { titleKey: 'inventory.warehouses.new' },
  },
  {
    path: 'warehouses/:id/edit',
    loadComponent: () => import('./warehouses/warehouse-form.component').then((m) => m.WarehouseFormComponent),
    data: { titleKey: 'inventory.warehouses.edit' },
  },
  {
    path: 'zones',
    loadComponent: () => import('./zones/zone-list.component').then((m) => m.ZoneListComponent),
    data: { titleKey: 'inventory.zones.title' },
  },
  {
    path: 'zones/new',
    loadComponent: () => import('./zones/zone-form.component').then((m) => m.ZoneFormComponent),
    data: { titleKey: 'inventory.zones.new' },
  },
  {
    path: 'zones/:id/edit',
    loadComponent: () => import('./zones/zone-form.component').then((m) => m.ZoneFormComponent),
    data: { titleKey: 'inventory.zones.edit' },
  },
  {
    path: 'bins',
    loadComponent: () => import('./bins/bin-list.component').then((m) => m.BinListComponent),
    data: { titleKey: 'inventory.bins.title' },
  },
  {
    path: 'bins/new',
    loadComponent: () => import('./bins/bin-form.component').then((m) => m.BinFormComponent),
    data: { titleKey: 'inventory.bins.new' },
  },
  {
    path: 'bins/:id/edit',
    loadComponent: () => import('./bins/bin-form.component').then((m) => m.BinFormComponent),
    data: { titleKey: 'inventory.bins.edit' },
  },
  {
    path: 'suppliers',
    loadComponent: () => import('./suppliers/supplier-list.component').then((m) => m.SupplierListComponent),
    data: { titleKey: 'inventory.suppliers.title' },
  },
  {
    path: 'suppliers/new',
    loadComponent: () => import('./suppliers/supplier-form.component').then((m) => m.SupplierFormComponent),
    data: { titleKey: 'inventory.suppliers.new' },
  },
  {
    path: 'suppliers/:id/edit',
    loadComponent: () => import('./suppliers/supplier-form.component').then((m) => m.SupplierFormComponent),
    data: { titleKey: 'inventory.suppliers.edit' },
  },
  {
    path: 'variants',
    loadComponent: () => import('./variants/product-variant-list.component').then((m) => m.ProductVariantListComponent),
    data: { titleKey: 'inventory.variants.title' },
  },
  {
    path: 'variants/new',
    loadComponent: () => import('./variants/product-variant-form.component').then((m) => m.ProductVariantFormComponent),
    data: { titleKey: 'inventory.variants.new' },
  },
  {
    path: 'variants/:id/edit',
    loadComponent: () => import('./variants/product-variant-form.component').then((m) => m.ProductVariantFormComponent),
    data: { titleKey: 'inventory.variants.edit' },
  },
  {
    path: 'supplier-products',
    loadComponent: () => import('./supplier-products/supplier-product-list.component').then((m) => m.SupplierProductListComponent),
    data: { titleKey: 'inventory.supplierProducts.title' },
  },
  {
    path: 'supplier-products/new',
    loadComponent: () => import('./supplier-products/supplier-product-form.component').then((m) => m.SupplierProductFormComponent),
    data: { titleKey: 'inventory.supplierProducts.new' },
  },
  {
    path: 'supplier-products/:id/edit',
    loadComponent: () => import('./supplier-products/supplier-product-form.component').then((m) => m.SupplierProductFormComponent),
    data: { titleKey: 'inventory.supplierProducts.edit' },
  },
  {
    path: 'stock',
    loadComponent: () => import('./stock-levels/stock-levels.component').then((m) => m.StockLevelsComponent),
    data: { titleKey: 'inventory.stock.title' },
  },
  {
    path: 'stock-ledger',
    loadComponent: () => import('./stock-ledger/stock-ledger-list.component').then((m) => m.StockLedgerListComponent),
    data: { titleKey: 'inventory.ledger.title' },
  },
  {
    path: 'transfers',
    loadComponent: () => import('./transfers/stock-transfer-list.component').then((m) => m.StockTransferListComponent),
    data: { titleKey: 'inventory.transfers.title' },
  },
  {
    path: 'transfers/new',
    loadComponent: () => import('./transfers/stock-transfer-form.component').then((m) => m.StockTransferFormComponent),
    data: { titleKey: 'inventory.transfers.new' },
  },
  {
    path: 'transfers/:id',
    loadComponent: () => import('./transfers/stock-transfer-detail.component').then((m) => m.StockTransferDetailComponent),
    data: { titleKey: 'inventory.transfers.detail' },
  },
  {
    path: 'transfers/:id/edit',
    loadComponent: () => import('./transfers/stock-transfer-form.component').then((m) => m.StockTransferFormComponent),
    data: { titleKey: 'inventory.transfers.edit' },
  },
  {
    path: 'adjustments',
    loadComponent: () => import('./adjustments/stock-adjustment-list.component').then((m) => m.StockAdjustmentListComponent),
    data: { titleKey: 'inventory.adjustments.title' },
  },
  {
    path: 'adjustments/new',
    loadComponent: () => import('./adjustments/stock-adjustment-form.component').then((m) => m.StockAdjustmentFormComponent),
    data: { titleKey: 'inventory.adjustments.new' },
  },
  {
    path: 'adjustments/:id',
    loadComponent: () => import('./adjustments/stock-adjustment-detail.component').then((m) => m.StockAdjustmentDetailComponent),
    data: { titleKey: 'inventory.adjustments.detail' },
  },
  {
    path: 'adjustments/:id/edit',
    loadComponent: () => import('./adjustments/stock-adjustment-form.component').then((m) => m.StockAdjustmentFormComponent),
    data: { titleKey: 'inventory.adjustments.edit' },
  },
];
