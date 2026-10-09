import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
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
import { UserNamePipe } from '../../../shared/pipes/user-name.pipe';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { MovementQuantity, StockTransfer, StockTransferLine, TRANSFER_STATUS_SEVERITY } from '../inventory.models';
import { trimZeros } from '../variants/variant-options';
import { StockTransferLineService } from './stock-transfer-line.service';
import { StockTransferService } from './stock-transfer.service';

const QUANTITY = /^\d+(\.\d{1,3})?$/;

/** One line in the ship or receive dialog: how much moves now, capped by what is still outstanding. */
interface MoveRow {
  lineId: number;
  label: string;
  outstanding: number;
  quantity: string;
}

/**
 * One transfer and its workflow: submit → approve (or reject back to draft) → ship (stock leaves the source; the
 * quantities can be less than requested) → receive (stock enters the destination; part now, the rest later).
 * Cancel until it ships. Lines change on ship/receive, so they are read again after those steps.
 */
@Component({
  selector: 'app-stock-transfer-detail',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    TableModule,
    PageHeaderComponent,
    ReasonDialogComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    UserNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-transfer-detail.component.html',
})
export class StockTransferDetailComponent implements OnInit {
  private readonly api = inject(StockTransferService);
  private readonly linesApi = inject(StockTransferLineService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly transfer = signal<StockTransfer | null>(null);
  readonly lines = signal<StockTransferLine[]>([]);
  readonly loadError = signal<AppError | null>(null);
  readonly dialog = signal<'ship' | 'receive' | null>(null);
  readonly rejectDialogOpen = signal(false);
  readonly saving = signal(false);
  readonly dialogError = signal<string | null>(null);
  moveRows: MoveRow[] = [];
  carrier = '';
  trackingNumber = '';
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = TRANSFER_STATUS_SEVERITY;

  readonly actions = computed<PageHeaderAction[]>(() => {
    const transfer = this.transfer();
    if (!transfer) {
      return [];
    }
    const cancel: PageHeaderAction = { label: 'inventory.movements.cancel', icon: 'pi pi-times', severity: 'danger', onClick: () => this.cancel() };
    switch (transfer.status) {
      case 'draft':
        return [
          { label: 'common.edit', icon: 'pi pi-pencil', severity: 'secondary', onClick: () => this.edit() },
          { label: 'inventory.movements.submit', icon: 'pi pi-send', onClick: () => this.submitForApproval() },
          cancel,
          { label: 'common.delete', icon: 'pi pi-trash', severity: 'secondary', onClick: () => this.remove() },
        ];
      case 'pending_approval':
        return [
          { label: 'inventory.movements.approve', icon: 'pi pi-check', onClick: () => this.approve() },
          { label: 'inventory.movements.reject', icon: 'pi pi-undo', severity: 'secondary', onClick: () => this.rejectDialogOpen.set(true) },
          cancel,
        ];
      case 'approved':
        return [{ label: 'inventory.transfers.ship', icon: 'pi pi-truck', onClick: () => this.openMove('ship') }, cancel];
      case 'in_transit':
      case 'partial':
        return [{ label: 'inventory.transfers.receive', icon: 'pi pi-inbox', onClick: () => this.openMove('receive') }];
      default:
        return [];
    }
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    forkJoin({ transfer: this.api.retrieve(this.id), lines: this.linesApi.forTransfer(this.id) }).subscribe({
      next: ({ transfer, lines }) => {
        this.transfer.set(transfer);
        this.lines.set(lines);
      },
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/inventory/transfers']);
  }

  onRejectConfirmed(reason: string): void {
    this.confirm.runAction(
      () => this.api.reject(this.id, reason),
      'inventory.movements.toasts.rejected',
      (transfer) => {
        this.rejectDialogOpen.set(false);
        this.transfer.set(transfer);
      },
    );
  }

  submitMove(): void {
    const invalid = this.moveRows.some(
      (row) => !QUANTITY.test(row.quantity.trim()) || Number(row.quantity) > row.outstanding,
    );
    if (invalid || this.moveRows.every((row) => Number(row.quantity) === 0)) {
      this.dialogError.set('inventory.transfers.moveQuantity');
      return;
    }
    const lines: MovementQuantity[] = this.moveRows
      .filter((row) => Number(row.quantity) > 0)
      .map((row) => ({ line_id: row.lineId, quantity: row.quantity.trim() }));
    const shipping = this.dialog() === 'ship';
    this.dialogError.set(null);
    this.saving.set(true);
    this.confirm.runAction(
      () => (shipping ? this.api.ship(this.id, lines, this.carrier.trim(), this.trackingNumber.trim()) : this.api.receive(this.id, lines)),
      shipping ? 'inventory.transfers.toasts.shipped' : 'inventory.transfers.toasts.received',
      () => {
        this.saving.set(false);
        this.dialog.set(null);
        // Shipped and received quantities live on the lines: read both again.
        this.load();
      },
      () => this.saving.set(false),
    );
  }

  private openMove(kind: 'ship' | 'receive'): void {
    this.moveRows = this.lines().map((line) => {
      const outstanding =
        kind === 'ship'
          ? Number(line.quantity_requested) - Number(line.quantity_shipped)
          : Number(line.quantity_shipped) - Number(line.quantity_received);
      return {
        lineId: line.id,
        label: `${line.product_variant.sku} — ${line.product_variant.name}`,
        outstanding,
        quantity: trimZeros(String(Math.max(outstanding, 0))),
      };
    });
    const transfer = this.transfer();
    this.carrier = transfer?.carrier ?? '';
    this.trackingNumber = transfer?.tracking_number ?? '';
    this.dialogError.set(null);
    this.dialog.set(kind);
  }

  private edit(): void {
    void this.router.navigate(['/inventory/transfers', this.id, 'edit']);
  }

  private submitForApproval(): void {
    this.confirm.confirmAction({
      message: 'inventory.transfers.confirm.submit',
      accept: 'inventory.movements.submit',
      success: 'inventory.movements.toasts.submitted',
      run: () => this.api.submit(this.id),
      onDone: (transfer) => this.transfer.set(transfer),
    });
  }

  private approve(): void {
    this.confirm.confirmAction({
      message: 'inventory.transfers.confirm.approve',
      accept: 'inventory.movements.approve',
      success: 'inventory.movements.toasts.approved',
      run: () => this.api.approve(this.id),
      onDone: (transfer) => this.transfer.set(transfer),
    });
  }

  private cancel(): void {
    this.confirm.confirmAction({
      message: 'inventory.transfers.confirm.cancel',
      accept: 'inventory.movements.cancel',
      success: 'inventory.movements.toasts.cancelled',
      danger: true,
      run: () => this.api.cancel(this.id),
      onDone: (transfer) => this.transfer.set(transfer),
    });
  }

  private remove(): void {
    this.confirm.confirmDelete(this.transfer()?.transfer_number ?? '', () => this.api.remove(this.id), () => this.goBack());
  }
}
