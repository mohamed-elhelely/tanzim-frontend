import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import {
  ORDER_STATUS_SEVERITY,
  OrderPriority,
  PRIORITY_SEVERITY,
  SALES_ORDER_STATUSES,
  SalesOrderListItem,
  SalesOrderStatus,
} from '../sales.models';
import { SalesOrderService } from './sales-order.service';

@Component({
  selector: 'app-sales-order-list',
  imports: [
    FormsModule,
    DecimalPipe,
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    ProgressBarModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-order-list.component.html',
})
export class SalesOrderListComponent implements OnInit {
  private readonly api = inject(SalesOrderService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  status: SalesOrderStatus | null = null;
  readonly table = new ServerTable<SalesOrderListItem>((query) =>
    this.api.list({ ...query, filters: this.status ? { status: this.status } : {} }),
  );
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = SALES_ORDER_STATUSES.map((status) => ({ value: status, label: `sales.orderStatuses.${status}` }));

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'sales.orders.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/sales/orders/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  onStatusChange(status: SalesOrderStatus | null): void {
    this.status = status;
    this.table.first.set(0);
    this.table.load();
  }

  statusSeverity(status: SalesOrderStatus) {
    return ORDER_STATUS_SEVERITY[status] ?? 'secondary';
  }

  prioritySeverity(priority: OrderPriority) {
    return PRIORITY_SEVERITY[priority] ?? 'secondary';
  }

  open(row: SalesOrderListItem): void {
    void this.router.navigate(['/sales/orders', row.id]);
  }

  /** Only drafts can be deleted; later orders hold reservations and stock movements. */
  confirmDelete(row: SalesOrderListItem): void {
    this.confirm.confirmDelete(row.order_number, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
