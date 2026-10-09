import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReasonDialogComponent } from '../../../shared/components/reason-dialog/reason-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import {
  CONDITIONS,
  CUSTOMER_RETURN_SEVERITY,
  Condition,
  CustomerReturn,
  DISPOSITIONS,
  Disposition,
  RESTOCKING_FOR,
} from '../returns.models';
import { CustomerReturnService } from './customer-return.service';

const QUANTITY = /^\d+(\.\d{1,3})?$/;
const MONEY = /^\d+(\.\d{1,4})?$/;

interface ReceiveRow {
  lineId: number;
  name: string;
  requested: number;
  quantity: string;
}

interface InspectRow {
  lineId: number;
  name: string;
  received: number;
  quantity: string;
  condition: Condition | '';
  disposition: Disposition;
  defect: string;
}

/**
 * One customer return and its workflow: approve → receive (back into stock) → inspect (decide what happens to
 * each item) → close with the refund. A replacement order can be created once inspected; a request can be
 * rejected until the goods are received.
 */
@Component({
  selector: 'app-customer-return-detail',
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
    SelectModule,
    TableModule,
    PageHeaderComponent,
    ReasonDialogComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-return-detail.component.html',
})
export class CustomerReturnDetailComponent implements OnInit {
  private readonly api = inject(CustomerReturnService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly rma = signal<CustomerReturn | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly dialog = signal<'receive' | 'inspect' | 'close' | null>(null);
  readonly rejectDialogOpen = signal(false);
  readonly saving = signal(false);
  readonly dialogError = signal<string | null>(null);
  receiveRows: ReceiveRow[] = [];
  inspectRows: InspectRow[] = [];
  refundAmount = '';
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = CUSTOMER_RETURN_SEVERITY;
  readonly conditionOptions = CONDITIONS.map((condition) => ({ value: condition, label: `returns.conditions.${condition}` }));
  readonly dispositionOptions = DISPOSITIONS.map((disposition) => ({ value: disposition, label: `returns.dispositions.${disposition}` }));

  readonly actions = computed<PageHeaderAction[]>(() => {
    const rma = this.rma();
    if (!rma) {
      return [];
    }
    const actions: PageHeaderAction[] = [];
    switch (rma.status) {
      case 'requested':
        actions.push({ label: 'returns.actions.approve', icon: 'pi pi-check', onClick: () => this.approve() });
        actions.push({ label: 'returns.actions.reject', icon: 'pi pi-times', severity: 'danger', onClick: () => this.rejectDialogOpen.set(true) });
        actions.push({ label: 'common.delete', icon: 'pi pi-trash', severity: 'secondary', onClick: () => this.remove() });
        break;
      case 'approved':
        actions.push({ label: 'returns.actions.receive', icon: 'pi pi-inbox', onClick: () => this.openReceive() });
        actions.push({ label: 'returns.actions.reject', icon: 'pi pi-times', severity: 'danger', onClick: () => this.rejectDialogOpen.set(true) });
        break;
      case 'received':
        actions.push({ label: 'returns.actions.inspect', icon: 'pi pi-search', onClick: () => this.openInspect() });
        break;
      case 'inspected':
        actions.push({ label: 'returns.actions.close', icon: 'pi pi-flag', onClick: () => this.openClose() });
        break;
    }
    // Only for returns settled by replacement or exchange, once something was accepted.
    const replaces = rma.refund_method === 'replacement' || rma.refund_method === 'exchange';
    if (replaces && ['inspected', 'closed'].includes(rma.status) && !rma.replacement_order && Number(rma.total_items_accepted) > 0) {
      actions.push({ label: 'returns.actions.createReplacement', icon: 'pi pi-refresh', severity: 'secondary', onClick: () => this.createReplacement() });
    }
    return actions;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.api.detail(this.id).subscribe({
      next: (rma) => this.rma.set(rma),
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/returns/customer']);
  }

  onRejectConfirmed(reason: string): void {
    this.confirm.runAction(
      () => this.api.reject(this.id, reason),
      'returns.toasts.rejected',
      (rma) => {
        this.rejectDialogOpen.set(false);
        this.applyUpdate(rma);
      },
    );
  }

  submitReceive(): void {
    const invalid = this.receiveRows.some(
      (row) => !QUANTITY.test(row.quantity.trim()) || Number(row.quantity) > row.requested,
    );
    if (invalid) {
      this.dialogError.set('returns.hints.receiveQuantity');
      return;
    }
    this.run(() =>
      this.api.receive(
        this.id,
        this.receiveRows.map((row) => ({ line_id: row.lineId, quantity_received: row.quantity.trim() })),
      ),
      'returns.toasts.received',
    );
  }

  submitInspect(): void {
    const invalid = this.inspectRows.some((row) => !QUANTITY.test(row.quantity.trim()) || Number(row.quantity) > row.received);
    if (invalid) {
      this.dialogError.set('returns.hints.inspectQuantity');
      return;
    }
    this.run(() =>
      this.api.inspect(
        this.id,
        this.inspectRows.map((row) => ({
          line_id: row.lineId,
          quantity_accepted: row.quantity.trim(),
          condition: row.condition,
          disposition: row.disposition,
          restocking_decision: RESTOCKING_FOR[row.disposition],
          rejection_reason: Number(row.quantity) === 0 ? row.defect.trim() : '',
          defect_description: row.defect.trim(),
        })),
      ),
      'returns.toasts.inspected',
    );
  }

  submitClose(): void {
    const amount = this.refundAmount.trim();
    if (amount && !MONEY.test(amount)) {
      this.dialogError.set('returns.hints.refundAmount');
      return;
    }
    this.run(() => this.api.close(this.id, amount || null), 'returns.toasts.closed');
  }

  private run(request: () => ReturnType<CustomerReturnService['approve']>, success: string): void {
    this.dialogError.set(null);
    this.saving.set(true);
    this.confirm.runAction(
      request,
      success,
      (rma) => {
        this.saving.set(false);
        this.dialog.set(null);
        this.applyUpdate(rma);
      },
      () => this.saving.set(false),
    );
  }

  private openReceive(): void {
    this.receiveRows = (this.rma()?.lines ?? []).map((line) => ({
      lineId: line.id,
      name: line.product_name,
      requested: Number(line.quantity_requested),
      quantity: String(Number(line.quantity_requested)),
    }));
    this.openDialog('receive');
  }

  private openInspect(): void {
    this.inspectRows = (this.rma()?.lines ?? []).map((line) => ({
      lineId: line.id,
      name: line.product_name,
      received: Number(line.quantity_received),
      quantity: String(Number(line.quantity_received)),
      condition: 'good',
      disposition: 'accept',
      defect: line.defect_description ?? '',
    }));
    this.openDialog('inspect');
  }

  private openClose(): void {
    this.refundAmount = Number(this.rma()?.total_return_value ?? 0).toFixed(2);
    this.openDialog('close');
  }

  private openDialog(name: 'receive' | 'inspect' | 'close'): void {
    this.dialogError.set(null);
    this.dialog.set(name);
  }

  private approve(): void {
    this.confirm.confirmAction({
      message: 'returns.confirm.approve',
      accept: 'returns.actions.approve',
      success: 'returns.toasts.approved',
      run: () => this.api.approve(this.id),
      onDone: (rma) => this.applyUpdate(rma),
    });
  }

  /** Action responses carry the updated return but not `sales_order_number`, so keep the loaded one. */
  private applyUpdate(rma: CustomerReturn): void {
    this.rma.update((current) => ({ ...rma, sales_order_number: rma.sales_order_number ?? current?.sales_order_number ?? null }));
  }

  private createReplacement(): void {
    this.confirm.confirmAction({
      message: 'returns.confirm.createReplacement',
      accept: 'returns.actions.createReplacement',
      success: 'returns.toasts.replacementCreated',
      run: () => this.api.createReplacement(this.id),
      onDone: (result) => void this.router.navigate(['/sales/orders', result.replacement_order]),
    });
  }

  private remove(): void {
    this.confirm.confirmDelete(this.rma()?.return_number ?? '', () => this.api.remove(this.id), () => this.goBack());
  }
}
