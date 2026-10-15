import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ChoiceFilterComponent } from '../../../shared/table/choice-filter.component';
import { DateRangeFilterComponent } from '../../../shared/table/date-range-filter.component';
import { FilterErrorsComponent } from '../../../shared/table/filter-errors.component';
import { ServerTable, splitFilter } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { SUPPLIER_PAYMENT_METHODS, SupplierPayment, SupplierPaymentMethod } from '../accounting.models';
import { SupplierPaymentService } from './supplier-payment.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';

@Component({
  selector: 'app-supplier-payment-list',
  imports: [
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    ChoiceFilterComponent,
    DateRangeFilterComponent,
    FilterErrorsComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './supplier-payment-list.component.html',
})
export class SupplierPaymentListComponent implements OnInit {
  private readonly api = inject(SupplierPaymentService);
  private readonly router = inject(Router);

  status: ('completed' | 'voided')[] = [];
  method: SupplierPaymentMethod[] = [];
  dateFrom = '';
  dateTo = '';
  readonly table = new ServerTable<SupplierPayment>(
    (query) => this.api.list({ page: query.page, pageSize: query.pageSize, filters: query.filters }),
    {
      filters: () => ({ status: this.status, payment_method: this.method, date_from: this.dateFrom, date_to: this.dateTo }),
      reset: () => {
        this.status = [];
        this.method = [];
        this.dateFrom = '';
        this.dateTo = '';
      },
      restore: (filters) => {
        this.status = splitFilter(filters['status']) as SupplierPaymentListComponent['status'];
        this.method = splitFilter(filters['payment_method']) as SupplierPaymentListComponent['method'];
        this.dateFrom = String(filters['date_from'] ?? '');
        this.dateTo = String(filters['date_to'] ?? '');
      },
    },
  );
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = (['completed', 'voided'] as const).map((status) => ({ value: status, label: `accounting.paymentStatuses.${status}` }));
  readonly methodOptions = SUPPLIER_PAYMENT_METHODS.map((method) => ({ value: method, label: `sales.paymentMethods.${method}` }));

  readonly headerActions: PageHeaderAction[] = [
    { label: 'accounting.payments.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/accounting/supplier-payments/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  open(row: SupplierPayment): void {
    void this.router.navigate(['/accounting/supplier-payments', row.id]);
  }
}
