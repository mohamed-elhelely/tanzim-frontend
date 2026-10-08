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
import { SUPPLIER_RETURN_SEVERITY, SUPPLIER_RETURN_STATUSES, SupplierReturnListItem, SupplierReturnStatus } from '../returns.models';
import { SupplierReturnService } from './supplier-return.service';

@Component({
  selector: 'app-supplier-return-list',
  imports: [
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
  templateUrl: './supplier-return-list.component.html',
})
export class SupplierReturnListComponent implements OnInit {
  private readonly api = inject(SupplierReturnService);
  private readonly router = inject(Router);

  status: SupplierReturnStatus | null = null;
  readonly table = new ServerTable<SupplierReturnListItem>((query) =>
    this.api.list({ ...query, filters: this.status ? { status: this.status } : {} }),
  );
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = SUPPLIER_RETURN_STATUSES.map((status) => ({ value: status, label: `returns.supplierStatuses.${status}` }));

  readonly headerActions: PageHeaderAction[] = [
    { label: 'returns.supplier.new', icon: 'pi pi-plus', onClick: () => void this.router.navigate(['/returns/supplier/new']) },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  onFilterChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  statusSeverity(status: SupplierReturnStatus) {
    return SUPPLIER_RETURN_SEVERITY[status] ?? 'secondary';
  }

  open(row: SupplierReturnListItem): void {
    void this.router.navigate(['/returns/supplier', row.id]);
  }
}
