import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
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
import { AccessService } from '../../../core/auth/access.service';
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
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';

@Component({
  selector: 'app-sales-order-list',
  imports: [
    SavedViewsComponent,
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
  private readonly access = inject(AccessService);

  status: SalesOrderStatus | null = null;
  readonly table = new ServerTable<SalesOrderListItem>(
    (query) => this.api.list(query),
    {
      filters: () => ({ status: this.status }),
      reset: () => {
        this.status = null;
      },
      restore: (filters) => {
        this.status = (filters['status'] ?? null) as SalesOrderListComponent['status'];
      },
    },
  );

  /** Ticking rows is for acting on several drafts at once. */
  readonly canBulk = computed(() => this.access.can('change_salesorder'));
  /** The ticked rows the bulk action applies to (drafts only). */
  readonly selectedDrafts = computed(() => this.table.selection().filter((row) => row.status === 'draft'));
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

  confirmSelected(): void {
    this.confirm.confirmBulk({
      rows: this.selectedDrafts(),
      message: 'sales.confirm.confirmOrders',
      accept: 'sales.actions.confirmOrder',
      success: 'sales.toasts.ordersConfirmed',
      run: (row: SalesOrderListItem) => this.api.confirm(row.id),
      onDone: () => this.table.load(),
    });
  }
}
