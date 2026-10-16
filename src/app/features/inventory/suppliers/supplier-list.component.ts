import { ChangeDetectionStrategy, Component, OnInit, inject, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AccessService } from '../../../core/auth/access.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ImportExportActionsComponent } from '../../import-export/import-export-actions.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';

import { Supplier } from '../inventory.models';
import { SupplierService } from './supplier.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../shared/ui/table/table-templates';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';
import { TableSelectAllComponent } from '../../../shared/ui/table/table-select-all.component';
import { TableRowSelectComponent } from '../../../shared/ui/table/table-row-select.component';

@Component({
  selector: 'app-supplier-list',
  imports: [
    TableRowSelectComponent,
    TableSelectAllComponent,
    SortableHeaderComponent,
    TableEmptyDirective,
    TableRowDirective,
    TableHeaderDirective,
    TableComponent,
    ButtonComponent,
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    TranslatePipe,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    PageHeaderComponent,
    ImportExportActionsComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './supplier-list.component.html',
})
export class SupplierListComponent implements OnInit {
  private readonly api = inject(SupplierService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);

  /** The supplier statement lives in the accounting reports; offered when the user may open them. */
  readonly canStatement = computed(() => this.access.can('view_accountingreport'));

  readonly table = new ServerTable<Supplier>((query) => this.api.list(query));

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'inventory.suppliers.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/inventory/suppliers/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  edit(row: Supplier): void {
    void this.router.navigate(['/inventory/suppliers', row.id, 'edit']);
  }

  confirmDelete(row: Supplier): void {
    this.confirm.confirmDelete(row.name, () => this.api.remove(row.id), () => this.table.afterDelete());
  }

  statement(row: { id: number }): void {
    void this.router.navigate(['/accounting/reports'], { queryParams: { type: 'supplier_statement', supplier: row.id } });
  }

  confirmBulkDelete(): void {
    this.confirm.confirmBulkDelete(
      this.table.selection(),
      (row: Supplier) => this.api.remove(row.id),
      (deleted) => this.table.afterBulkDelete(deleted),
    );
  }
}
