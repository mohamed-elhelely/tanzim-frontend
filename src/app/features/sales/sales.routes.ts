import { Routes } from '@angular/router';

/** Lazy routes under /sales. `orders/new` must come before `orders/:id`. */
export const SALES_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'orders' },
  {
    path: 'orders',
    loadComponent: () => import('./orders/sales-order-list.component').then((m) => m.SalesOrderListComponent),
    data: { titleKey: 'sales.orders.title' },
  },
  {
    path: 'orders/new',
    loadComponent: () => import('./orders/sales-order-form.component').then((m) => m.SalesOrderFormComponent),
    data: { titleKey: 'sales.orders.new' },
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./orders/sales-order-detail.component').then((m) => m.SalesOrderDetailComponent),
    data: { titleKey: 'sales.orders.detail' },
  },
  {
    path: 'orders/:id/edit',
    loadComponent: () => import('./orders/sales-order-form.component').then((m) => m.SalesOrderFormComponent),
    data: { titleKey: 'sales.orders.edit' },
  },
  {
    path: 'customers',
    loadComponent: () => import('./customers/customer-list.component').then((m) => m.CustomerListComponent),
    data: { titleKey: 'sales.customers.title' },
  },
  {
    path: 'customers/new',
    loadComponent: () => import('./customers/customer-form.component').then((m) => m.CustomerFormComponent),
    data: { titleKey: 'sales.customers.new' },
  },
  {
    path: 'customers/:id/edit',
    loadComponent: () => import('./customers/customer-form.component').then((m) => m.CustomerFormComponent),
    data: { titleKey: 'sales.customers.edit' },
  },
];
