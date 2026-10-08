import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import {
  CUSTOMER_RETURN_SEVERITY,
  CUSTOMER_RETURN_STATUSES,
  CustomerReturnListItem,
  CustomerReturnStatus,
  RETURN_REASONS,
  ReturnReason,
} from '../returns.models';
import { CustomerReturnService } from './customer-return.service';

@Component({
  selector: 'app-customer-return-list',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
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

  status: CustomerReturnStatus | null = null;
  reason: ReturnReason | null = null;
  readonly table = new ServerTable<CustomerReturnListItem>((query) => {
    const filters: Record<string, string> = {};
    if (this.status) {
      filters['status'] = this.status;
    }
    if (this.reason) {
      filters['return_reason'] = this.reason;
    }
    return this.api.list({ ...query, filters });
  });
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = CUSTOMER_RETURN_STATUSES.map((status) => ({ value: status, label: `returns.customerStatuses.${status}` }));
  readonly reasonOptions = RETURN_REASONS.map((reason) => ({ value: reason, label: `returns.reasons.${reason}` }));

  readonly headerActions: PageHeaderAction[] = [
    { label: 'returns.customer.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/returns/customer/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  onFilterChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  statusSeverity(status: CustomerReturnStatus) {
    return CUSTOMER_RETURN_SEVERITY[status] ?? 'secondary';
  }

  open(row: CustomerReturnListItem): void {
    void this.router.navigate(['/returns/customer', row.id]);
  }
}
