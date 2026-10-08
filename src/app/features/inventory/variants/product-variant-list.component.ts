import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { map } from 'rxjs';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { ProductVariant } from '../inventory.models';
import { ProductService } from '../products/product.service';
import { ProductVariantService } from './product-variant.service';

@Component({
  selector: 'app-product-variant-list',
  imports: [
    TranslatePipe,
    RouterLink,
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
  templateUrl: './product-variant-list.component.html',
})
export class ProductVariantListComponent {
  private readonly api = inject(ProductVariantService);
  private readonly products = inject(ProductService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  /** `?product=3` (from the products list) narrows the list to one product's variants. */
  readonly productId = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => Number(params.get('product')) || null)),
    { initialValue: null },
  );
  readonly productName = signal('');
  readonly table = new ServerTable<ProductVariant>((query) => {
    const product = this.productId();
    return this.api.list(product ? { ...query, filters: { product } } : query);
  });
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    {
      label: 'inventory.variants.new',
      icon: 'pi pi-plus',
      onClick: () =>
        void this.router.navigate(['/inventory/variants/new'], {
          queryParams: this.productId() ? { product: this.productId() } : {},
        }),
    },
  ];

  constructor() {
    // Runs on start and whenever ?product changes ("Show all" keeps this component alive).
    effect(() => {
      const product = this.productId();
      untracked(() => {
        this.table.first.set(0);
        this.table.load();
        this.productName.set('');
        if (product) {
          this.products.retrieve(product).subscribe({ next: (p) => this.productName.set(p.name), error: () => undefined });
        }
      });
    });
  }

  edit(row: ProductVariant): void {
    void this.router.navigate(['/inventory/variants', row.id, 'edit']);
  }

  confirmDelete(row: ProductVariant): void {
    this.confirm.confirmDelete(row.sku, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
