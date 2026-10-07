import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { Paginated } from '../models/api-response.model';
import { BaseApiService } from './base-api.service';

export interface ListQuery {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
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

  all(): Observable<T[]> {
    return this.get<T[]>(this.path).pipe(map((response) => response.data ?? []));
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
