import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReasonDialogComponent } from '../../../shared/components/reason-dialog/reason-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { DeliveryNoteService } from '../deliveries/delivery-note.service';
import { SalesInvoiceService } from '../invoices/sales-invoice.service';
import {
  Address,
  DELIVERY_STATUS_SEVERITY,
  DeliveryNoteListItem,
  INVOICE_STATUS_SEVERITY,
  ORDER_STATUS_SEVERITY,
  PRIORITY_SEVERITY,
  SalesInvoiceListItem,
  SalesOrder,
  SalesOrderStatus,
} from '../sales.models';
import { SalesOrderService } from './sales-order.service';

/** Which workflow actions the backend allows from each status (sales/services.py). */
const CAN_CANCEL: SalesOrderStatus[] = ['draft', 'confirmed', 'on_hold'];
const CAN_SHIP: SalesOrderStatus[] = ['confirmed', 'picking'];

/** One line in the Ship dialog. */
interface ShipRow {
  lineId: number;
  sku: string | null;
  name: string;
  remaining: number;
  quantity: string;
}

/**
 * One order: lines, totals, its deliveries and invoices, and its workflow
 * (confirm, ship, mark delivered, invoice, duplicate, cancel).
 */
@Component({
  selector: 'app-sales-order-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    TableModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ReasonDialogComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-order-detail.component.html',
})
export class SalesOrderDetailComponent implements OnInit {
  private readonly api = inject(SalesOrderService);
  private readonly deliveriesApi = inject(DeliveryNoteService);
  private readonly invoicesApi = inject(SalesInvoiceService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Follows the route: cloning navigates to the copy, which reuses this component. */
  id = 0;
  readonly order = signal<SalesOrder | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly deliveries = signal<DeliveryNoteListItem[]>([]);
  readonly invoices = signal<SalesInvoiceListItem[]>([]);
  readonly cancelDialogOpen = signal(false);
  readonly shipDialogOpen = signal(false);
  readonly shipping = signal(false);
  readonly shipError = signal<string | null>(null);
  shipRows: ShipRow[] = [];
  carrier = '';
  trackingNumber = '';
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = ORDER_STATUS_SEVERITY;
  readonly prioritySeverity = PRIORITY_SEVERITY;
  readonly deliverySeverity = DELIVERY_STATUS_SEVERITY;
  readonly invoiceSeverity = INVOICE_STATUS_SEVERITY;

  /** An order is invoiced once: "Create invoice" only while it has no invoice that isn't cancelled (the backend refuses a second). */
  readonly canInvoice = computed(
    () => this.order()?.status === 'delivered' && !this.invoices().some((invoice) => invoice.status !== 'cancelled'),
  );

  readonly actions = computed<PageHeaderAction[]>(() => {
    const order = this.order();
    if (!order) {
      return [];
    }
    const actions: PageHeaderAction[] = [];
    if (order.status === 'draft') {
      actions.push({ label: 'common.edit', icon: 'pi pi-pencil', severity: 'secondary', onClick: () => this.edit() });
      actions.push({ label: 'sales.actions.confirmOrder', icon: 'pi pi-check', onClick: () => this.confirmOrder() });
    }
    if (CAN_SHIP.includes(order.status) && order.lines.some((line) => remainingToShip(line) > 0)) {
      actions.push({ label: 'sales.actions.ship', icon: 'pi pi-truck', onClick: () => this.openShip() });
    }
    if (order.status === 'shipped') {
      actions.push({ label: 'sales.actions.markDelivered', icon: 'pi pi-flag', onClick: () => this.markDelivered() });
    }
    if (this.canInvoice()) {
      actions.push({ label: 'sales.actions.createInvoice', icon: 'pi pi-file', onClick: () => this.createInvoice() });
    }
    actions.push({ label: 'sales.actions.clone', icon: 'pi pi-copy', severity: 'secondary', onClick: () => this.clone() });
    if (CAN_CANCEL.includes(order.status)) {
      actions.push({ label: 'sales.actions.cancelOrder', icon: 'pi pi-times', severity: 'danger', onClick: () => this.cancelDialogOpen.set(true) });
    }
    return actions;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id = Number(params.get('id'));
      this.order.set(null);
      this.deliveries.set([]);
      this.invoices.set([]);
      this.load();
    });
  }

  load(): void {
    this.loadError.set(null);
    this.api.detail(this.id).subscribe({
      next: (order) => this.order.set(order),
      error: (error: AppError) => this.loadError.set(error),
    });
    this.loadRelated();
  }

  goBack(): void {
    void this.router.navigate(['/sales/orders']);
  }

  /** "Street · City, State ZIP · Country" with empty parts skipped. */
  formatAddress(address: Address | null | undefined): string {
    if (!address) {
      return '';
    }
    const cityLine = [address.city, [address.state, address.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return [address.street, cityLine, address.country].filter(Boolean).join(' · ');
  }

  onCancelConfirmed(reason: string): void {
    this.confirm.runAction(
      () => this.api.cancel(this.id, reason),
      'sales.toasts.cancelled',
      (order) => {
        this.cancelDialogOpen.set(false);
        this.order.set(order);
      },
    );
  }

  /** Ships the entered quantities; the new delivery note opens next. */
  submitShip(): void {
    const lines = this.shipRows
      .filter((row) => Number(row.quantity) > 0)
      .map((row) => ({ line_id: row.lineId, quantity: row.quantity.trim() }));
    const invalid = this.shipRows.some(
      (row) => row.quantity.trim() !== '' && (!/^\d+(\.\d{1,3})?$/.test(row.quantity.trim()) || Number(row.quantity) > row.remaining),
    );
    if (invalid || lines.length === 0) {
      this.shipError.set(invalid ? 'sales.hints.shipQuantity' : 'sales.hints.shipSomething');
      return;
    }
    this.shipError.set(null);
    this.shipping.set(true);
    this.confirm.runAction(
      () => this.api.createDelivery(this.id, { lines, carrier: this.carrier.trim(), tracking_number: this.trackingNumber.trim() }),
      'sales.toasts.deliveryCreated',
      (note) => {
        this.shipping.set(false);
        this.shipDialogOpen.set(false);
        void this.router.navigate(['/sales/deliveries', note.id]);
      },
      () => this.shipping.set(false),
    );
  }

  private loadRelated(): void {
    this.deliveriesApi.all({ sales_order: this.id }).subscribe({ next: (notes) => this.deliveries.set(notes), error: () => undefined });
    this.invoicesApi.all({ sales_order: this.id }).subscribe({ next: (invoices) => this.invoices.set(invoices), error: () => undefined });
  }

  private edit(): void {
    void this.router.navigate(['/sales/orders', this.id, 'edit']);
  }

  private openShip(): void {
    const order = this.order();
    this.shipRows = (order?.lines ?? [])
      .filter((line) => remainingToShip(line) > 0)
      .map((line) => ({
        lineId: line.id,
        sku: line.sku,
        name: line.product_name,
        remaining: remainingToShip(line),
        quantity: String(remainingToShip(line)),
      }));
    this.carrier = '';
    this.trackingNumber = '';
    this.shipError.set(null);
    this.shipDialogOpen.set(true);
  }

  private confirmOrder(): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.confirmOrder',
      accept: 'sales.actions.confirmOrder',
      success: 'sales.toasts.confirmed',
      run: () => this.api.confirm(this.id),
      onDone: (order) => this.order.set(order),
    });
  }

  private markDelivered(): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.markDelivered',
      accept: 'sales.actions.markDelivered',
      success: 'sales.toasts.delivered',
      run: () => this.api.markDelivered(this.id),
      onDone: (order) => this.order.set(order),
    });
  }

  private createInvoice(): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.createInvoice',
      accept: 'sales.actions.createInvoice',
      success: 'sales.toasts.invoiceCreated',
      run: () => this.invoicesApi.createFromOrder(this.id),
      onDone: (invoice) => void this.router.navigate(['/sales/invoices', invoice.id]),
    });
  }

  private clone(): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.clone',
      accept: 'sales.actions.clone',
      success: 'sales.toasts.cloned',
      run: () => this.api.clone(this.id),
      onDone: (copy) => void this.router.navigate(['/sales/orders', copy.id]),
    });
  }
}

function remainingToShip(line: { quantity_ordered: string; quantity_shipped: string }): number {
  return Math.max(0, Number(line.quantity_ordered) - Number(line.quantity_shipped));
}
