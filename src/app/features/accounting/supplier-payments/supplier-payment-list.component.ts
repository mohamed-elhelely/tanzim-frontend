import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { SUPPLIER_PAYMENT_METHODS, SupplierPayment, SupplierPaymentMethod } from '../accounting.models';
import { SupplierPaymentService } from './supplier-payment.service';

@Component({
  selector: 'app-supplier-payment-list',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    SelectModule,
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

  status: 'completed' | 'voided' | null = null;
  method: SupplierPaymentMethod | null = null;
  readonly table = new ServerTable<SupplierPayment>((query) => {
    const filters: Record<string, string> = {};
    if (this.status) {
      filters['status'] = this.status;
    }
    if (this.method) {
      filters['payment_method'] = this.method;
    }
    return this.api.list({ page: query.page, pageSize: query.pageSize, filters });
  });
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = (['completed', 'voided'] as const).map((status) => ({ value: status, label: `accounting.paymentStatuses.${status}` }));
  readonly methodOptions = SUPPLIER_PAYMENT_METHODS.map((method) => ({ value: method, label: `sales.paymentMethods.${method}` }));

  readonly headerActions: PageHeaderAction[] = [
    { label: 'accounting.payments.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/accounting/supplier-payments/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  onFilterChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  open(row: SupplierPayment): void {
    void this.router.navigate(['/accounting/supplier-payments', row.id]);
  }
}
