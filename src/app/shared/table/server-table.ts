import { DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TableLazyLoadEvent } from 'primeng/table';
import { Observable, Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ListQuery } from '../../core/api/crud-api';
import { AppError } from '../../core/errors/app-error';
import { Paginated } from '../../core/models/api-response.model';

/**
 * State for a server-paged PrimeNG table (`[lazy]="true"`), shared by every list screen:
 * paging, sorting, a 300 ms debounced search, and loading/error state.
 *
 * Create it in a field initializer so it can use the component's injection context:
 *   readonly table = new ServerTable((query) => this.api.list(query));
 * then call `table.load()` in ngOnInit and bind the template to `table.*`.
 */
export class ServerTable<T> {
  readonly rows = signal<T[]>([]);
  readonly total = signal(0);
  /** Index of the first row on the current page (PrimeNG's `first`). */
  readonly first = signal(0);
  readonly pageSize = signal(10);
  readonly loading = signal(false);
  readonly error = signal<AppError | null>(null);

  private readonly search$ = new Subject<string>();
  private searchTerm = '';
  private ordering?: string;
  private request?: Subscription;

  constructor(private readonly fetch: (query: ListQuery) => Observable<Paginated<T>>) {
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed()).subscribe((term) => {
      this.searchTerm = term;
      this.first.set(0);
      this.load();
    });
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

  onSearch(term: string): void {
    this.search$.next(term.trim());
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    // Cancel the previous request so a slower, older response can't overwrite newer results.
    this.request?.unsubscribe();
    this.request = this.fetch({
      page: Math.floor(this.first() / this.pageSize()) + 1,
      pageSize: this.pageSize(),
      search: this.searchTerm || undefined,
      ordering: this.ordering,
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

  /** Reload after a delete; if it removed the only row on a later page, step back a page first. */
  afterDelete(): void {
    if (this.rows().length === 1 && this.first() >= this.pageSize()) {
      this.first.update((first) => first - this.pageSize());
    }
    this.load();
  }
}
