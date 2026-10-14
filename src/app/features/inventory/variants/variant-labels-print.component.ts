import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { AppError } from '../../../core/errors/app-error';
import { BarcodeComponent } from '../../../shared/components/barcode/barcode.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { canEncodeCode128 } from '../../../shared/utils/code128';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { ProductVariant } from '../inventory.models';
import { ProductVariantService } from './product-variant.service';

/**
 * Shelf/product labels for the variants in `?ids=1,2,3`: name, SKU, price and a Code 128 barcode of the
 * variant's barcode (or its SKU when it has none). Printed on A4 in a grid; `copies` repeats each label.
 */
@Component({
  selector: 'app-variant-labels-print',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    InputNumberModule,
    BarcodeComponent,
    ErrorStateComponent,
    LoadingStateComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './variant-labels-print.component.html',
})
export class VariantLabelsPrintComponent implements OnInit {
  private readonly api = inject(ProductVariantService);
  private readonly route = inject(ActivatedRoute);

  readonly variants = signal<ProductVariant[] | null>(null);
  readonly error = signal<AppError | null>(null);
  readonly copies = signal(1);
  readonly showPrice = signal(true);
  readonly errorTitleKey = errorTitleKey;

  /** Each variant `copies` times, in order. */
  readonly labels = computed(() => (this.variants() ?? []).flatMap((variant) => Array<ProductVariant>(this.copies()).fill(variant)));

  ngOnInit(): void {
    const ids = (this.route.snapshot.queryParamMap.get('ids') ?? '')
      .split(',')
      .map(Number)
      .filter((id) => Number.isInteger(id) && id > 0);
    if (!ids.length) {
      this.variants.set([]);
      return;
    }
    forkJoin(ids.map((id) => this.api.retrieve(id))).subscribe({
      next: (variants) => this.variants.set(variants),
      error: (error: AppError) => this.error.set(error),
    });
  }

  /** The barcode field when it can be printed as Code 128, else the SKU. */
  code(variant: ProductVariant): string {
    return variant.barcode && canEncodeCode128(variant.barcode) ? variant.barcode : variant.sku;
  }

  setCopies(value: number | null): void {
    this.copies.set(Math.min(Math.max(Math.round(value ?? 1), 1), 100));
  }

  print(): void {
    window.print();
  }

  close(): void {
    window.close();
  }
}
