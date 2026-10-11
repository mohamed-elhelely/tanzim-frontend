import { DestroyRef, inject, signal } from '@angular/core';
import { TableLazyLoadEvent } from 'primeng/table';
import { Observable, Subscription } from 'rxjs';
import { ListQuery } from '../../core/api/crud-api';
import { AppError } from '../../core/errors/app-error';
import { Paginated } from '../../core/models/api-response.model';

/**
 * State for a server-paged PrimeNG table (`[lazy]="true"`), shared by every list screen:
 * paging, sorting, search, extra filters, and loading/error state.
 *
 * Create it in a field initializer so it can use the component's injection context:
 *   readonly table = new ServerTable((query) => this.api.list(query));
 * then call `table.load()` in ngOnInit and bind the template to `table.*`.
 *
 * Search and filters only take effect when the user asks for them (`apply()`, wired to an
 * Apply button and Enter): editing a filter field changes nothing until then, and paging keeps
 * using the filters that were last applied rather than half-edited ones. `changed()` says whether
 * applying would fetch anything new, so the Apply button can stay disabled until then.
 */
export type FilterValues = Record<string, string | number | boolean | null | undefined>;

export interface ServerTableOptions {
  /** Reads the screen's filter fields; empty values (null, undefined, '') are dropped. */
  filters?: () => FilterValues;
  /** Puts the screen's filter fields back to their defaults (used by `clear()`). */
  reset?: () => void;
}

export class ServerTable<T> {
  readonly rows = signal<T[]>([]);
  readonly total = signal(0);
  /** Index of the first row on the current page (PrimeNG's `first`). */
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);

  /** Rows ticked for a bulk action; emptied whenever the table reloads. */
  readonly selection = signal<T[]>([]);
  /** What the search box shows; it only reaches the server on `apply()`. */
  readonly searchDraft = signal('');
  /** True while a search or filters are applied, so the screen can offer "clear". */
  readonly filtered = signal(false);

  private searchTerm = '';
  private appliedFilters?: Record<string, string | number>;
  private ordering?: string;
  private request?: Subscription;

  constructor(
    private readonly fetch: (query: ListQuery) => Observable<Paginated<T>>,
    private readonly options: ServerTableOptions = {},
  ) {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  /** PrimeNG's (onLazyLoad): page change, page-size change or sort. */
  onLazyLoad(event: TableLazyLoadEvent): void {
    this.first.set(event.first ?? 0);
    this.pageSize.set(event.rows ?? this.pageSize());
    const field = typeof event.sortField === 'string' ? event.sortField : undefined;
    this.ordering = field ? `${event.sortOrder === -1 ? '-' : ''}${field}` : undefined;
    this.load();
  }

  /** Whether the search box or the filter fields differ from what the table is showing. */
  changed(): boolean {
    return this.searchDraft().trim() !== this.searchTerm || !sameFilters(this.readFilters(), this.appliedFilters ?? {});
  }

  /** Apply the search box and the current filter fields, back on page 1; does nothing if they are unchanged. */
  apply(term?: string): void {
    if (term !== undefined) {
      this.searchDraft.set(term);
    }
    if (!this.changed()) {
      return;
    }
    this.searchTerm = this.searchDraft().trim();
    this.appliedFilters = this.readFilters();
    this.filtered.set(!!this.searchTerm || Object.keys(this.appliedFilters).length > 0);
    this.first.set(0);
    this.load();
  }

  load(): void {
    this.selection.set([]);
    this.loading.set(true);
    this.error.set(null);
    // Cancel the previous request so a slower, older response can't overwrite newer results.
    this.request?.unsubscribe();
    // The first load uses the filter fields' initial values.
    this.appliedFilters ??= this.readFilters();
    this.request = this.fetch({
      page: Math.floor(this.first() / this.pageSize()) + 1,
      pageSize: this.pageSize(),
      search: this.searchTerm || undefined,
      ordering: this.ordering,
      filters: this.appliedFilters,
    }).subscribe({
      next: (page) => {
        this.rows.set(page.items);
        this.total.set(page.total);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  /** The search and filters the table is showing, e.g. to export exactly those rows. */
  appliedQuery(): { search?: string; filters: Record<string, string | number> } {
    return { search: this.searchTerm || undefined, filters: { ...(this.appliedFilters ?? this.readFilters()) } };
  }

  /** Empty the search box, reset the filter fields and show everything again. */
  clear(): void {
    this.searchDraft.set('');
    this.options.reset?.();
    this.apply();
  }

  private readFilters(): Record<string, string | number> {
    const filters: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(this.options.filters?.() ?? {})) {
      if (value !== null && value !== undefined && value !== '') {
        filters[key] = typeof value === 'boolean' ? String(value) : value;
      }
    }
    return filters;
  }

  /** Reload after a delete; if it removed the only row on a later page, step back a page first. */
  afterDelete(): void {
    this.afterBulkDelete(1);
  }

  /** Reload after deleting `count` rows of this page; if that may have emptied a later page, step back first. */
  afterBulkDelete(count: number): void {
    if (count >= this.rows().length && this.first() >= this.pageSize()) {
      this.first.update((first) => first - this.pageSize());
    }
    this.load();
  }
}

function sameFilters(a: Record<string, string | number>, b: Record<string, string | number>): boolean {
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => a[key] === b[key]);
}
