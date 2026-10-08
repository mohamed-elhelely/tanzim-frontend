import { Component } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { ListQuery } from '../../core/api/crud-api';
import { Paginated } from '../../core/models/api-response.model';
import { ServerTable } from './server-table';

type Fetch = (query: ListQuery) => Observable<Paginated<number>>;

/** ServerTable needs an injection context, so it is created inside a throwaway component. */
function createTable(fetch: Fetch) {
  @Component({ template: '' })
  class HostComponent {
    readonly table = new ServerTable<number>(fetch);
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
    expect(fetch).toHaveBeenCalledWith({ page: 1, pageSize: 10, search: undefined, ordering: undefined });
    expect(table.rows()).toEqual([1, 2]);
    expect(table.total()).toBe(30);

    table.onLazyLoad({ first: 20, rows: 10, sortField: 'name', sortOrder: -1 });
    expect(fetch).toHaveBeenCalledWith({ page: 3, pageSize: 10, search: undefined, ordering: '-name' });
  });

  it('debounces search, trims it and goes back to page 1', fakeAsync(() => {
    const fetch = jasmine.createSpy('fetch').and.returnValue(of(page([])));
    const { table } = createTable(fetch);
    table.onLazyLoad({ first: 10, rows: 10 });
    table.onSearch('ab');
    tick(100);
    table.onSearch(' abc ');
    tick(300);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ page: 1, search: 'abc' }));
  }));

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
