import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ListQuery } from '../../core/api/crud-api';
import { Paginated } from '../../core/models/api-response.model';
import { ServerTable, ServerTableOptions } from './server-table';

type Fetch = (query: ListQuery) => Observable<Paginated<number>>;

/** ServerTable needs an injection context, so it is created inside a throwaway component. */
function createTable(fetch: Fetch, options: ServerTableOptions = {}) {
  @Component({ template: '' })
  class HostComponent {
    readonly table = new ServerTable<number>(fetch, options);
  }
  const fixture = TestBed.createComponent(HostComponent);
  return { table: fixture.componentInstance.table, fixture };
}

const page = (items: number[], total = items.length): Paginated<number> => ({ items, total, page: 1, pageSize: 10 });

describe('ServerTable', () => {
  it('loads page 1 and turns PrimeNG paging/sorting into a ListQuery', () => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(of(page([1, 2], 30)));
    const { table } = createTable(fetch);
    table.load();
    expect(fetch).toHaveBeenCalledWith({ page: 1, pageSize: 10, search: undefined, ordering: undefined, filters: {} });
    expect(table.rows()).toEqual([1, 2]);
    expect(table.total()).toBe(30);

    table.onLazyLoad({ first: 20, rows: 10, sortField: 'name', sortOrder: -1 });
    expect(fetch).toHaveBeenCalledWith({ page: 3, pageSize: 10, search: undefined, ordering: '-name', filters: {} });
  });

  it('only searches when applied, trimmed and back on page 1', () => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(of(page([])));
    const { table } = createTable(fetch);
    table.onLazyLoad({ first: 10, rows: 10 });
    table.apply(' abc ');
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 1, search: 'abc' }));
    expect(table.filtered()).toBeTrue();
  });

  it('keeps paging on the applied filters, not half-edited ones', () => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(of(page([])));
    const fields: { status: string | null; open: boolean | null } = { status: 'draft', open: null };
    const { table } = createTable(fetch, { filters: () => ({ ...fields }) });
    table.load();
    expect(fetch.calls.mostRecent().args[0].filters).toEqual({ status: 'draft' });

    fields.status = 'posted';
    fields.open = true;
    table.onLazyLoad({ first: 10, rows: 10 });
    expect(fetch.calls.mostRecent().args[0].filters).toEqual({ status: 'draft' });

    table.apply();
    expect(fetch.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 1, filters: { status: 'posted', open: 'true' } }));
  });

  it('does not refetch when nothing changed since the last apply', () => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(of(page([])));
    const fields = { status: null as string | null };
    const { table } = createTable(fetch, { filters: () => ({ ...fields }) });
    table.load();
    expect(table.changed()).toBeFalse();

    table.searchDraft.set('  ');
    expect(table.changed()).toBeFalse();
    fields.status = 'draft';
    expect(table.changed()).toBeTrue();
    table.apply();
    expect(table.changed()).toBeFalse();

    table.apply();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('clear() resets the search and the filter fields and reloads', () => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(of(page([])));
    const fields = { status: null as string | null };
    const { table } = createTable(fetch, { filters: () => ({ ...fields }), reset: () => (fields.status = null) });
    table.load();
    fields.status = 'draft';
    table.apply('abc');
    expect(table.filtered()).toBeTrue();

    table.clear();
    expect(table.searchDraft()).toBe('');
    expect(table.filtered()).toBeFalse();
    expect(fetch.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ search: undefined, filters: {} }));
  });

  it('keeps only the newest request', () => {
    const first = new Subject<Paginated<number>>();
    const fetch = jasmine.createSpy('fetch').and.returnValues(first, of(page([9])));
    const { table } = createTable(fetch);
    table.load();
    table.load();
    first.next(page([1]));
    expect(table.rows()).toEqual([9]);
  });

  it('exposes the error and stops loading', () => {
    const { table } = createTable(() => throwError(() => ({ status: 403, message: 'Forbidden', errors: {} })));
    table.load();
    expect(table.error()?.status).toBe(403);
    expect(table.loading()).toBeFalse();
  });

  it('steps back a page after deleting the only row on a later page', () => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(of(page([15], 11)));
    const { table } = createTable(fetch);
    table.onLazyLoad({ first: 10, rows: 10 });
    table.afterDelete();
    expect(fetch.calls.mostRecent().args[0].page).toBe(1);
  });
});
