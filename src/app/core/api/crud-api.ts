import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { Paginated } from '../models/api-response.model';
import { BaseApiService } from './base-api.service';

export interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  /** Exact-match filters the endpoint supports, e.g. `{ product: 3 }` → `?product=3`. */
  filters?: Record<string, string | number>;
}

/**
 * Standard calls for one backend resource. Subclasses only set `path`,
 * e.g. 'company/v1/departments/' (always keep the trailing slash).
 * `TCreated` is the create response when the backend returns a different shape than `T`.
 */
@Injectable()
export abstract class CrudApi<T, TPayload, TCreated = T> extends BaseApiService {
  protected abstract readonly path: string;

  list(query: ListQuery): Observable<Paginated<T>> {
    const params: Record<string, string | number> = { page: query.page, page_size: query.pageSize };
    if (query.search) {
      params['search'] = query.search;
    }
    if (query.ordering) {
      params['ordering'] = query.ordering;
    }
    Object.assign(params, query.filters ?? {});
    return this.get<T[]>(this.path, { params }).pipe(
      map((response) => {
        const items = response.data ?? [];
        return {
          items,
          total: response.metadata?.total_count ?? items.length,
          page: query.page,
          pageSize: query.pageSize,
        };
      }),
    );
  }

  /** Everything from an unpaginated endpoint, optionally with exact-match filters (e.g. `{ sales_order: 4 }`). */
  all(filters: Record<string, string | number> = {}): Observable<T[]> {
    return this.get<T[]>(this.path, { params: filters }).pipe(map((response) => response.data ?? []));
  }

  /** Every record of a paginated resource, fetched 100 at a time (the backend's max page size). */
  listAll(): Observable<T[]> {
    const pageSize = 100;
    return this.list({ page: 1, pageSize }).pipe(
      switchMap((first) => {
        const pageCount = Math.ceil(first.total / pageSize);
        if (pageCount <= 1) {
          return of(first.items);
        }
        const rest = Array.from({ length: pageCount - 1 }, (_, i) => this.list({ page: i + 2, pageSize }));
        return forkJoin(rest).pipe(map((pages) => first.items.concat(...pages.map((page) => page.items))));
      }),
    );
  }

  dropdown<D>(): Observable<D[]> {
    return this.get<D[]>(this.path, { params: { dropdown: 'true' } }).pipe(map((response) => response.data ?? []));
  }

  retrieve(id: number): Observable<T> {
    return this.get<T>(this.detailPath(id)).pipe(map((response) => response.data as T));
  }

  create(body: TPayload): Observable<TCreated> {
    return this.post<TCreated>(this.path, body).pipe(map((response) => response.data as TCreated));
  }

  update(id: number, body: Partial<TPayload>): Observable<T> {
    return this.patch<T>(this.detailPath(id), body).pipe(map((response) => response.data as T));
  }

  remove(id: number): Observable<void> {
    return this.delete<unknown>(this.detailPath(id)).pipe(map(() => undefined));
  }

  protected detailPath(id: number): string {
    return `${this.path}${id}/`;
  }
}
