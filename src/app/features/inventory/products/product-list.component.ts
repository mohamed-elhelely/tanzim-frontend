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
import { ImportExportActionsComponent } from '../../import-export/import-export-actions.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Product } from '../inventory.models';
import { ProductService } from './product.service';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';

@Component({
  selector: 'app-product-list',
  imports: [
    SavedViewsComponent,
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    PageHeaderComponent,
    ImportExportActionsComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-list.component.html',
})
export class ProductListComponent implements OnInit {
  private readonly api = inject(ProductService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly table = new ServerTable<Product>((query) => this.api.list(query));
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'inventory.products.new',
      icon: 'pi pi-plus',
      onClick: () => void this.router.navigate(['/inventory/products/new']),
    },
  ];

  ngOnInit(): void {
    this.table.load();
  }

  edit(row: Product): void {
    void this.router.navigate(['/inventory/products', row.id, 'edit']);
  }

  /** Opens this product's variants (the variants list filtered with ?product=). */
  variants(row: Product): void {
    void this.router.navigate(['/inventory/variants'], { queryParams: { product: row.id } });
  }

  confirmDelete(row: Product): void {
    this.confirm.confirmDelete(row.name, () => this.api.remove(row.id), () => this.table.afterDelete());
  }

  confirmBulkDelete(): void {
    this.confirm.confirmBulkDelete(
      this.table.selection(),
      (row: Product) => this.api.remove(row.id),
      (deleted) => this.table.afterBulkDelete(deleted),
    );
  }
}
