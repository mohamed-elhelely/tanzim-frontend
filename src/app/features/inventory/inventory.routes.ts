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
];
