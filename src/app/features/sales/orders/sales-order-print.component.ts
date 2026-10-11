import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { PrintLayoutComponent } from '../../../shared/components/print-layout/print-layout.component';
import { SalesOrder, formatAddress } from '../sales.models';
import { SalesOrderService } from './sales-order.service';

/**
 * A sales order on paper: an order confirmation (or, while a draft, a quotation) for the customer, with
 * addresses, lines and totals. Internal notes stay off the page. Opened in a new tab with `?print=1`.
 */
@Component({
  selector: 'app-sales-order-print',
  imports: [DecimalPipe, TranslatePipe, PrintLayoutComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-order-print.component.html',
})
export class SalesOrderPrintComponent implements OnInit {
  private readonly api = inject(SalesOrderService);
  private readonly access = inject(AccessService);
  private readonly route = inject(ActivatedRoute);

  readonly order = signal<SalesOrder | null>(null);
  readonly error = signal<AppError | null>(null);
  /** A draft prints as a quotation; anything later as an order confirmation. */
  readonly titleKey = computed(() => (this.order()?.status === 'draft' ? 'print.quotation' : 'print.orderConfirmation'));
  readonly warningKey = computed(() => (this.order()?.status === 'cancelled' ? 'sales.orderStatuses.cancelled' : null));
  readonly formatAddress = formatAddress;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const autoPrint = this.route.snapshot.queryParamMap.get('print') === '1';
    this.access.load().subscribe();
    this.api.detail(id).subscribe({
      next: (order) => {
        this.order.set(order);
        if (autoPrint) {
          setTimeout(() => window.print(), 500);
        }
      },
      error: (error: AppError) => this.error.set(error),
    });
  }

  /** The discount column only shows when a line has one. */
  hasDiscount(order: SalesOrder): boolean {
    return order.lines.some((line) => Number(line.discount_percent) > 0);
  }
}
