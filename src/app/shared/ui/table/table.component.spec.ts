import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { ListQuery } from '../../../core/api/crud-api';
import { ServerTable } from '../../table/server-table';
import { SortableHeaderComponent } from './sortable-header.component';
import { TableRowSelectComponent } from './table-row-select.component';
import { TableSelectAllComponent } from './table-select-all.component';
import { TableEmptyDirective, TableFooterDirective, TableHeaderDirective, TableRowDirective } from './table-templates';
import { TableComponent } from './table.component';

interface Item {
  id: number;
  name: string;
  qty: number;
}

const ITEMS: Item[] = [
  { id: 1, name: 'Bolt', qty: 30 },
  { id: 2, name: 'Anchor', qty: 5 },
  { id: 3, name: 'Clamp', qty: 12 },
];

const IMPORTS = [
  TableComponent,
  TableHeaderDirective,
  TableRowDirective,
  TableEmptyDirective,
  TableFooterDirective,
  SortableHeaderComponent,
  TableSelectAllComponent,
  TableRowSelectComponent,
];

@Component({
  imports: IMPORTS,
  template: `
    <app-table [table]="table">
      <ng-template appTableHeader>
        <tr>
          <th><app-table-select-all></app-table-select-all></th>
          <th appSortable="name">Name</th>
        </tr>
      </ng-template>
      <ng-template appTableRow let-row>
        <tr class="row">
          <td><app-table-row-select [row]="row"></app-table-row-select></td>
          <td>{{ row.name }}</td>
        </tr>
      </ng-template>
    </app-table>
  `,
})
class ServerHostComponent {
  readonly queries: ListQuery[] = [];
  readonly table = new ServerTable<Item>((query) => {
    this.queries.push(query);
    return of({ items: ITEMS, total: 42, page: query.page, pageSize: query.pageSize });
  });
}

@Component({
  imports: IMPORTS,
  template: `
    <app-table [rows]="rows()" [filterText]="search()" [filterFields]="['name']" sortField="qty">
      <ng-template appTableHeader>
        <tr><th appSortable="name">Name</th><th appSortable="qty">Qty</th></tr>
      </ng-template>
      <ng-template appTableRow let-row>
        <tr class="row"><td>{{ row.name }}</td><td>{{ row.qty }}</td></tr>
      </ng-template>
      <ng-template appTableEmpty>
        <tr><td colspan="2" class="empty">Nothing here</td></tr>
      </ng-template>
      <ng-template appTableFooter>
        <tr><td class="total">Total</td><td>{{ 47 }}</td></tr>
      </ng-template>
    </app-table>
  `,
})
class LocalHostComponent {
  readonly rows = signal<Item[]>(ITEMS);
  readonly search = signal('');
}

/** The name cell of each rendered row (the cell whose text is a capitalised word). */
function names(root: HTMLElement): string[] {
  return [...root.querySelectorAll('tr.row')].map(
    (tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent!.trim()).find((text) => /^[A-Z][a-z]+$/.test(text))!,
  );
}

describe('TableComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideTranslateService()] }));

  describe('with a ServerTable', () => {
    function render() {
      const fixture = TestBed.createComponent(ServerHostComponent);
      fixture.componentInstance.table.load();
      fixture.detectChanges();
      return fixture;
    }

    it('shows the page and the server total in the paginator', () => {
      const fixture = render();
      const el: HTMLElement = fixture.nativeElement;
      expect(names(el)).toEqual(['Bolt', 'Anchor', 'Clamp']);
      expect(el.querySelector('.p-paginator')).not.toBeNull();
    });

    it('sorts on the server: ascending, then descending, from the first page', () => {
      const fixture = render();
      const header = fixture.nativeElement.querySelector('th[appsortable]') as HTMLElement;
      header.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.queries.at(-1)).toEqual(jasmine.objectContaining({ page: 1, ordering: 'name' }));
      expect(header.getAttribute('aria-sort')).toBe('ascending');
      header.click();
      fixture.detectChanges();
      expect(fixture.componentInstance.queries.at(-1)?.ordering).toBe('-name');
      expect(header.getAttribute('aria-sort')).toBe('descending');
    });

    it('selects rows into the ServerTable, and all of the page from the header', () => {
      const fixture = render();
      const boxes = () => [...fixture.nativeElement.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
      boxes()[1].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.table.selection().map((r) => r.id)).toEqual([1]);
      boxes()[0].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.table.selection().map((r) => r.id)).toEqual([1, 2, 3]);
      boxes()[0].click();
      fixture.detectChanges();
      expect(fixture.componentInstance.table.selection()).toEqual([]);
    });
  });

  describe('with local rows', () => {
    function render() {
      const fixture = TestBed.createComponent(LocalHostComponent);
      fixture.detectChanges();
      return fixture;
    }

    it('starts from sortField and sorts numbers as numbers', () => {
      expect(names(render().nativeElement)).toEqual(['Anchor', 'Clamp', 'Bolt']);
    });

    it('sorts by a clicked column, then reverses it', () => {
      const fixture = render();
      const nameHeader = fixture.nativeElement.querySelector('th[appsortable="name"]') as HTMLElement;
      nameHeader.click();
      fixture.detectChanges();
      expect(names(fixture.nativeElement)).toEqual(['Anchor', 'Bolt', 'Clamp']);
      nameHeader.click();
      fixture.detectChanges();
      expect(names(fixture.nativeElement)).toEqual(['Clamp', 'Bolt', 'Anchor']);
    });

    it('filters by the text in the given fields, and shows the empty template', () => {
      const fixture = render();
      fixture.componentInstance.search.set('cl');
      fixture.detectChanges();
      expect(names(fixture.nativeElement)).toEqual(['Clamp']);
      fixture.componentInstance.search.set('zzz');
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.empty')).not.toBeNull();
    });

    it('renders the footer and no paginator unless asked', () => {
      const el: HTMLElement = render().nativeElement;
      expect(el.querySelector('.total')).not.toBeNull();
      expect(el.querySelector('.p-paginator')).toBeNull();
    });
  });
});
