import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ChoiceFilterComponent } from '../../../shared/table/choice-filter.component';
import { DateRangeFilterComponent } from '../../../shared/table/date-range-filter.component';
import { FilterErrorsComponent } from '../../../shared/table/filter-errors.component';
import { ServerTable, splitFilter } from '../../../shared/table/server-table';

import {
  CUSTOMER_RETURN_SEVERITY,
  CUSTOMER_RETURN_STATUSES,
  CustomerReturnListItem,
  CustomerReturnStatus,
  RETURN_REASONS,
  ReturnReason,
} from '../returns.models';
import { CustomerReturnService } from './customer-return.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../shared/ui/table/table-templates';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';

@Component({
  selector: 'app-customer-return-list',
  imports: [
    SortableHeaderComponent,
    TableEmptyDirective,
    TableRowDirective,
    TableHeaderDirective,
    TableComponent,
    ButtonComponent,
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    AppDatePipe,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    ChoiceFilterComponent,
    DateRangeFilterComponent,
    FilterErrorsComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-return-list.component.html',
})
export class CustomerReturnListComponent implements OnInit {
  private readonly api = inject(CustomerReturnService);
  private readonly router = inject(Router);

  status: CustomerReturnStatus[] = [];
  reason: ReturnReason[] = [];
  dateFrom = '';
  dateTo = '';
  readonly table = new ServerTable<CustomerReturnListItem>(
    (query) => this.api.list(query),
    {
      filters: () => ({ status: this.status, return_reason: this.reason, date_from: this.dateFrom, date_to: this.dateTo }),
      reset: () => {
        this.status = [];
        this.reason = [];
        this.dateFrom = '';
        this.dateTo = '';
      },
      restore: (filters) => {
        this.status = splitFilter(filters['status']) as CustomerReturnListComponent['status'];
        this.reason = splitFilter(filters['return_reason']) as CustomerReturnListComponent['reason'];
        this.dateFrom = String(filters['date_from'] ?? '');
        this.dateTo = String(filters['date_to'] ?? '');
      },
    },
  );
  readonly statusOptions = CUSTOMER_RETURN_STATUSES.map((status) => ({ value: status, label: `returns.customerStatuses.${status}` }));
  readonly reasonOptions = RETURN_REASONS.map((reason) => ({ value: reason, label: `returns.reasons.${reason}` }));

  readonly headerActions: PageHeaderAction[] = [
    { label: 'returns.customer.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/returns/customer/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  statusSeverity(status: CustomerReturnStatus) {
    return CUSTOMER_RETURN_SEVERITY[status] ?? 'secondary';
  }

  open(row: CustomerReturnListItem): void {
    void this.router.navigate(['/returns/customer', row.id]);
  }
}
