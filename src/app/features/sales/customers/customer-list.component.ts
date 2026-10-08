import { DecimalPipe } from '@angular/common';
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
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { CUSTOMER_TYPES, CustomerListItem, CustomerType } from '../sales.models';
import { CustomerService } from './customer.service';

@Component({
  selector: 'app-customer-list',
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

  /** Exact-match filter sent with every page request. */
  customerType: CustomerType | null = null;
  readonly table = new ServerTable<CustomerListItem>((query) =>
    this.api.list({ ...query, filters: this.customerType ? { customer_type: this.customerType } : {} }),
  );
  readonly errorTitleKey = errorTitleKey;
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

  onTypeChange(type: CustomerType | null): void {
    this.customerType = type;
    this.table.first.set(0);
    this.table.load();
  }

  edit(row: CustomerListItem): void {
    void this.router.navigate(['/sales/customers', row.id, 'edit']);
  }

  confirmDelete(row: CustomerListItem): void {
    this.confirm.confirmDelete(row.name, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
