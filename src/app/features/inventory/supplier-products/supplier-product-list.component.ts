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
import { SupplierProduct } from '../inventory.models';
import { SupplierProductService } from './supplier-product.service';

@Component({
  selector: 'app-supplier-product-list',
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
  templateUrl: './supplier-product-list.component.html',
})
/** ⚠️ The list endpoint returns only supplier, variant and preferred (no cost or dates; BACKEND_REQUESTS item 2). */
export class SupplierProductListComponent implements OnInit {
  private readonly api = inject(SupplierProductService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly table = new ServerTable<SupplierProduct>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'inventory.supplierProducts.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/inventory/supplier-products/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  edit(row: SupplierProduct): void {
    void this.router.navigate(['/inventory/supplier-products', row.id, 'edit']);
  }

  confirmDelete(row: SupplierProduct): void {
    this.confirm.confirmDelete(`${row.supplier?.name ?? ''} · ${row.product_variant?.sku ?? ''}`, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
