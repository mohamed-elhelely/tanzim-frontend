import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { Address, ORDER_STATUS_SEVERITY, PRIORITY_SEVERITY, SalesOrder, SalesOrderStatus } from '../sales.models';
import { SalesOrderService } from './sales-order.service';

/** Which workflow actions the backend allows from each status (sales/services.py). */
const CAN_CANCEL: SalesOrderStatus[] = ['draft', 'confirmed', 'on_hold'];

/** One order: lines, totals and its workflow (confirm, cancel, clone, mark delivered). */
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
    TableModule,
    TextareaModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-order-detail.component.html',
})
export class SalesOrderDetailComponent implements OnInit {
  private readonly api = inject(SalesOrderService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Follows the route: cloning navigates to the copy, which reuses this component. */
  id = 0;
  readonly order = signal<SalesOrder | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly cancelDialogOpen = signal(false);
  cancelReason = '';
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = ORDER_STATUS_SEVERITY;
  readonly prioritySeverity = PRIORITY_SEVERITY;

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
    if (order.status === 'shipped') {
      actions.push({ label: 'sales.actions.markDelivered', icon: 'pi pi-flag', onClick: () => this.markDelivered() });
    }
    actions.push({ label: 'sales.actions.clone', icon: 'pi pi-copy', severity: 'secondary', onClick: () => this.clone() });
    if (CAN_CANCEL.includes(order.status)) {
      actions.push({ label: 'sales.actions.cancelOrder', icon: 'pi pi-times', severity: 'danger', onClick: () => this.openCancel() });
    }
    return actions;
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id = Number(params.get('id'));
      this.order.set(null);
      this.load();
    });
  }

  load(): void {
    this.loadError.set(null);
    this.api.detail(this.id).subscribe({
      next: (order) => this.order.set(order),
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/sales/orders']);
  }

  /** "Street, City, State ZIP, Country" with empty parts skipped. */
  formatAddress(address: Address | null | undefined): string {
    if (!address) {
      return '';
    }
    const cityLine = [address.city, [address.state, address.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    return [address.street, cityLine, address.country].filter(Boolean).join(' · ');
  }

  confirmCancel(): void {
    this.confirm.runAction(
      () => this.api.cancel(this.id, this.cancelReason.trim()),
      'sales.toasts.cancelled',
      (order) => {
        this.cancelDialogOpen.set(false);
        this.order.set(order);
      },
    );
  }

  private edit(): void {
    void this.router.navigate(['/sales/orders', this.id, 'edit']);
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

  private clone(): void {
    this.confirm.confirmAction({
      message: 'sales.confirm.clone',
      accept: 'sales.actions.clone',
      success: 'sales.toasts.cloned',
      run: () => this.api.clone(this.id),
      onDone: (copy) => void this.router.navigate(['/sales/orders', copy.id]),
    });
  }

  private openCancel(): void {
    this.cancelReason = '';
    this.cancelDialogOpen.set(true);
  }
}
