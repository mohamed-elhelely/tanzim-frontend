import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, input, linkedSignal, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ServerTable } from '../../table/server-table';
import { TableEmptyDirective, TableFooterDirective, TableHeaderDirective, TableRowDirective } from './table-templates';

export interface TableSort {
  field: string;
  /** 1 ascending, -1 descending. */
  order: 1 | -1;
}

interface PageChange {
  first?: number | null;
  rows?: number | null;
}

/**
 * The app's data table. Two modes:
 * - `[table]="table"`: a ServerTable (server paging, sorting and selection, loading state);
 * - `[rows]="lines"`: records already in memory, optionally sorted (`sortField`), paged (`[paginate]`) and searched
 *   (`filterText` over `filterFields`) here.
 * Screens give the header and row markup (`appTableHeader`, `appTableRow`, `appTableEmpty`, `appTableFooter`), with
 * `th[appSortable]` for sortable columns and `app-table-select-all` / `app-table-row-select` for checkboxes.
 */
@Component({
  selector: 'app-table',
  imports: [NgTemplateOutlet, TranslatePipe, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './table.component.html',
  host: { class: 'block' },
})
export class TableComponent<T = unknown> {
  readonly table = input<ServerTable<T>>();
  readonly rows = input<readonly T[] | null | undefined>([]);
  /** Local mode: page the rows here. */
  readonly paginate = input(false);
  /** Page sizes the user can pick; empty: no picker. */
  readonly pageSizes = input<number[]>([10, 25, 50]);
  /** Local mode: rows per page (default: the first page size, else 10). */
  readonly pageSize = input<number>();
  readonly loading = input(false);
  /** The field that tells records apart (selection, re-rendering). */
  readonly dataKey = input('id');
  /** Local mode: the sort to start with. */
  readonly sortField = input<string>();
  readonly sortOrder = input<1 | -1>(1);
  /** Local mode: show only rows where one of `filterFields` contains this text (case-insensitive). */
  readonly filterText = input('');
  readonly filterFields = input<string[]>([]);

  readonly headerTemplate = contentChild(TableHeaderDirective);
  readonly rowTemplate = contentChild(TableRowDirective);
  readonly emptyTemplate = contentChild(TableEmptyDirective);
  readonly footerTemplate = contentChild(TableFooterDirective);

  /** The current sort; the local mode starts from `sortField`. */
  readonly sort = linkedSignal<TableSort | null>(() => {
    const field = this.sortField();
    return field ? { field, order: this.sortOrder() } : null;
  });
  /** Selected records when there is no ServerTable to hold them. */
  private readonly localSelection = signal<T[]>([]);

  readonly server = computed(() => this.table() ?? null);

  /** What the table shows: the server page, or the local rows filtered and sorted. */
  readonly value = computed<T[]>(() => {
    const server = this.server();
    if (server) {
      return server.rows();
    }
    let rows = [...(this.rows() ?? [])];
    const text = this.filterText().trim().toLowerCase();
    const fields = this.filterFields();
    if (text && fields.length) {
      rows = rows.filter((row) => fields.some((field) => String(this.read(row, field) ?? '').toLowerCase().includes(text)));
    }
    const sort = this.sort();
    if (sort) {
      rows.sort((a, b) => sort.order * compare(this.read(a, sort.field), this.read(b, sort.field)));
    }
    return rows;
  });

  readonly selection = computed<T[]>(() => this.server()?.selection() ?? this.localSelection());

  // ----- sorting (th[appSortable]) -----

  /** A sortable header was clicked: ascending, then descending, then no sort (the server's or the given order). */
  toggleSort(field: string): void {
    const current = this.sortOf(field);
    const next: TableSort | null = current === 1 ? { field, order: -1 } : current === -1 ? null : { field, order: 1 };
    this.sort.set(next);
    const server = this.server();
    if (server) {
      server.onLazyLoad({ first: 0, rows: server.pageSize(), sortField: next?.field, sortOrder: next?.order });
    } else {
      this.localFirst.set(0);
    }
  }

  sortOf(field: string): 1 | -1 | null {
    const sort = this.sort();
    return sort?.field === field ? sort.order : null;
  }

  // ----- paging -----

  /** Local paging state (the server mode keeps it in the ServerTable). */
  private readonly localFirst = signal(0);
  private readonly localPageSize = linkedSignal(() => this.pageSize() ?? this.pageSizes()[0] ?? 10);
  readonly pageSizeOptions = computed(() => (this.pageSizes().length ? this.pageSizes() : undefined));

  readonly paged = computed(() => !!this.server() || this.paginate());
  readonly first = computed(() => this.server()?.first() ?? this.localFirst());
  readonly rowsPerPage = computed(() => this.server()?.pageSize() ?? this.localPageSize());
  readonly total = computed(() => this.server()?.total() ?? this.value().length);
  readonly busy = computed(() => this.server()?.loading() ?? this.loading());

  page(event: PageChange): void {
    const server = this.server();
    if (!server) {
      this.localFirst.set(event.first ?? 0);
      this.localPageSize.set(event.rows ?? this.localPageSize());
      return;
    }
    const sort = this.sort();
    server.onLazyLoad({ first: event.first ?? 0, rows: event.rows ?? undefined, sortField: sort?.field, sortOrder: sort?.order });
  }

  // ----- selection (app-table-select-all / app-table-row-select) -----

  isSelected(row: T): boolean {
    const key = this.read(row, this.dataKey());
    return this.selection().some((selected) => this.read(selected, this.dataKey()) === key);
  }

  toggleRow(row: T, selected: boolean): void {
    const key = this.read(row, this.dataKey());
    const others = this.selection().filter((r) => this.read(r, this.dataKey()) !== key);
    this.setSelection(selected ? [...others, row] : others);
  }

  /** Every row on the page is selected. */
  readonly allSelected = computed(() => {
    const rows = this.value();
    return rows.length > 0 && rows.every((row) => this.isSelected(row));
  });

  toggleAll(selected: boolean): void {
    const page = this.value();
    const keys = new Set(page.map((row) => this.read(row, this.dataKey())));
    const others = this.selection().filter((r) => !keys.has(this.read(r, this.dataKey())));
    this.setSelection(selected ? [...others, ...page] : others);
  }

  private setSelection(rows: T[]): void {
    const server = this.server();
    if (server) {
      server.selection.set(rows);
    } else {
      this.localSelection.set(rows);
    }
  }

  private read(row: T, field: string): unknown {
    return field.split('.').reduce<unknown>((value, part) => (value as Record<string, unknown> | null)?.[part], row);
  }
}

/** Numbers as numbers (also numeric strings like "12.50"), text by the user's alphabet; empty values last. */
function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined || a === '') return 1;
  if (b === null || b === undefined || b === '') return -1;
  const x = Number(a);
  const y = Number(b);
  if (!Number.isNaN(x) && !Number.isNaN(y)) return x - y;
  return String(a).localeCompare(String(b));
}
