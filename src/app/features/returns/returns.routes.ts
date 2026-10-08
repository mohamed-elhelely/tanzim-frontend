import { Routes } from '@angular/router';

/** Lazy routes under /returns. `…/new` must come before `…/:id`. */
export const RETURNS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'customer' },
  {
    path: 'customer',
    loadComponent: () => import('./customer-returns/customer-return-list.component').then((m) => m.CustomerReturnListComponent),
    data: { titleKey: 'returns.customer.title' },
  },
  {
    path: 'customer/new',
    loadComponent: () => import('./customer-returns/customer-return-form.component').then((m) => m.CustomerReturnFormComponent),
    data: { titleKey: 'returns.customer.new' },
  },
  {
    path: 'customer/:id',
    loadComponent: () => import('./customer-returns/customer-return-detail.component').then((m) => m.CustomerReturnDetailComponent),
    data: { titleKey: 'returns.customer.detail' },
  },
  {
    path: 'supplier',
    loadComponent: () => import('./supplier-returns/supplier-return-list.component').then((m) => m.SupplierReturnListComponent),
    data: { titleKey: 'returns.supplier.title' },
  },
  {
    path: 'supplier/new',
    loadComponent: () => import('./supplier-returns/supplier-return-form.component').then((m) => m.SupplierReturnFormComponent),
    data: { titleKey: 'returns.supplier.new' },
  },
  {
    path: 'supplier/:id',
    loadComponent: () => import('./supplier-returns/supplier-return-detail.component').then((m) => m.SupplierReturnDetailComponent),
    data: { titleKey: 'returns.supplier.detail' },
  },
];
