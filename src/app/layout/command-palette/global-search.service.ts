import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../core/api/base-api.service';

export const SEARCH_TYPES = ['customer', 'salesorder', 'salesinvoice', 'product', 'supplier'] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/** One record found by `GET /api/common/v1/search/`. */
export interface SearchHit {
  type: SearchType;
  id: number;
  label: string;
  sublabel: string;
}

/** Where each type's list lives (its menu entry, which carries the permission) and how to open one record. */
export const SEARCH_TYPE_ROUTES: Record<SearchType, { listLink: string; detail: (id: number) => string; icon: string }> = {
  customer: { listLink: '/sales/customers', detail: (id) => `/sales/customers/${id}/edit`, icon: 'pi pi-users' },
  salesorder: { listLink: '/sales/orders', detail: (id) => `/sales/orders/${id}`, icon: 'pi pi-file' },
  salesinvoice: { listLink: '/sales/invoices', detail: (id) => `/sales/invoices/${id}`, icon: 'pi pi-receipt' },
  product: { listLink: '/inventory/products', detail: (id) => `/inventory/products/${id}/edit`, icon: 'pi pi-box' },
  supplier: { listLink: '/inventory/suppliers', detail: (id) => `/inventory/suppliers/${id}/edit`, icon: 'pi pi-truck' },
};

/** The shortest query the backend searches for. */
export const MIN_SEARCH_LENGTH = 2;

/** Search across customers, orders, invoices, products and suppliers at once. */
@Injectable({ providedIn: 'root' })
export class GlobalSearchService extends BaseApiService {
  /** Up to `limit` (1–10) hits per type, only for `types`. */
  search(q: string, types: readonly SearchType[], limit = 5): Observable<SearchHit[]> {
    return this.get<SearchHit[]>('common/v1/search/', { params: { q, types: types.join(','), limit } }).pipe(
      map((response) => response.data ?? []),
    );
  }
}
