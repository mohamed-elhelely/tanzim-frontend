import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Supplier } from '../inventory.models';
import { SupplierService } from './supplier.service';

@Component({
  selector: 'app-supplier-list',
  imports: [
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    PageHeaderComponent,
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

  readonly table = new ServerTable<Supplier>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

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
}
