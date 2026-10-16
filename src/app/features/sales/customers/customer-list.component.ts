import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../../core/auth/access.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';

import { CUSTOMER_TYPES, CustomerListItem, CustomerType } from '../sales.models';
import { CustomerService } from './customer.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { SelectComponent } from '../../../shared/ui/select/select.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';

@Component({
  selector: 'app-customer-list',
  imports: [
    ButtonComponent,
    SelectComponent,
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    FormsModule,
    DecimalPipe,
    TranslatePipe,
    TableModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-list.component.html',
})
export class CustomerListComponent implements OnInit {
  private readonly api = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);

  /** The customer statement lives in the accounting reports; offered when the user may open them. */
  readonly canStatement = computed(() => this.access.can('view_accountingreport'));

  /** Exact-match filter sent with every page request. */
  customerType: CustomerType | null = null;
  readonly table = new ServerTable<CustomerListItem>(
    (query) => this.api.list(query),
    {
      filters: () => ({ customer_type: this.customerType }),
      reset: () => {
        this.customerType = null;
      },
      restore: (filters) => {
        this.customerType = (filters['customer_type'] ?? null) as CustomerListComponent['customerType'];
      },
    },
  );
  readonly typeOptions = CUSTOMER_TYPES.map((type) => ({ value: type, label: `sales.customerTypes.${type}` }));

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'sales.customers.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/sales/customers/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  edit(row: CustomerListItem): void {
    void this.router.navigate(['/sales/customers', row.id, 'edit']);
  }

  confirmDelete(row: CustomerListItem): void {
    this.confirm.confirmDelete(row.name, () => this.api.remove(row.id), () => this.table.afterDelete());
  }

  statement(row: { id: number }): void {
    void this.router.navigate(['/accounting/reports'], { queryParams: { type: 'customer_statement', customer: row.id } });
  }

  confirmBulkDelete(): void {
    this.confirm.confirmBulkDelete(
      this.table.selection(),
      (row: CustomerListItem) => this.api.remove(row.id),
      (deleted) => this.table.afterBulkDelete(deleted),
    );
  }
}
