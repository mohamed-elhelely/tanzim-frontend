import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ServerTable } from '../../../shared/table/server-table';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';
import { TableRowSelectComponent } from '../../../shared/ui/table/table-row-select.component';
import { TableSelectAllComponent } from '../../../shared/ui/table/table-select-all.component';
import {
  TableEmptyDirective,
  TableFooterDirective,
  TableHeaderDirective,
  TableRowDirective,
} from '../../../shared/ui/table/table-templates';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { ShowcaseSectionComponent } from '../showcase-section.component';

interface Product {
  id: number;
  sku: string;
  name: string;
  stock: number;
}

const PRODUCTS: Product[] = Array.from({ length: 37 }, (_, i) => ({
  id: i + 1,
  sku: `SKU-${String(i + 1).padStart(3, '0')}`,
  name: ['Hammer', 'Wrench', 'Drill', 'Saw', 'Clamp', 'Level', 'Chisel'][i % 7] + ` ${i + 1}`,
  stock: (i * 37) % 120,
}));

@Component({
  selector: 'app-tables-page',
  imports: [
    FormsModule,
    TableComponent,
    TableHeaderDirective,
    TableRowDirective,
    TableEmptyDirective,
    TableFooterDirective,
    SortableHeaderComponent,
    TableSelectAllComponent,
    TableRowSelectComponent,
    ShowcaseSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tables-page.component.html',
})
export class TablesPageComponent {
  /** A ServerTable over an in-memory "server" (paging and ordering done the way the backend would). */
  readonly server = new ServerTable<Product>((query) => {
    const sorted = [...PRODUCTS];
    if (query.ordering) {
      const desc = query.ordering.startsWith('-');
      const field = query.ordering.replace(/^-/, '') as keyof Product;
      sorted.sort((a, b) => (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * (desc ? -1 : 1));
    }
    const start = (query.page - 1) * query.pageSize;
    return of({ items: sorted.slice(start, start + query.pageSize), total: sorted.length, page: query.page, pageSize: query.pageSize });
  });
  readonly lines = PRODUCTS.slice(0, 4);
  readonly search = signal('');
  readonly none: Product[] = [];

  constructor() {
    this.server.load();
  }

  readonly code = {
    server: `<app-table [table]="table">\n  <ng-template appTableHeader>\n    <tr>\n      <th class="w-12"><app-table-select-all></app-table-select-all></th>\n      <th appSortable="name">{{ 'fields.name' | translate }}</th>\n    </tr>\n  </ng-template>\n  <ng-template appTableRow let-row>\n    <tr>\n      <td><app-table-row-select [row]="row"></app-table-row-select></td>\n      <td>{{ row.name }}</td>\n    </tr>\n  </ng-template>\n</app-table>`,
    local: `<app-table [rows]="users()" [paginate]="true" sortField="name" [filterText]="search()" [filterFields]="['name', 'email']">…</app-table>`,
    lines: `<app-table [rows]="order.lines">…<ng-template appTableFooter><tr>…totals…</tr></ng-template></app-table>`,
  };
}
