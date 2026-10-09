import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { DebitNoteService } from '../../accounting/debit-notes/debit-note.service';
import { SUPPLIER_RETURN_SEVERITY, SupplierReturn } from '../returns.models';
import { SupplierReturnService } from './supplier-return.service';

const MONEY = /^\d+(\.\d{1,4})?$/;

/** One supplier return: draft → approve (stock leaves) → shipped → confirmed by the supplier → closed with the refund. */
@Component({
  selector: 'app-supplier-return-detail',
  imports: [
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
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './supplier-return-detail.component.html',
})
export class SupplierReturnDetailComponent implements OnInit {
  private readonly api = inject(SupplierReturnService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly access = inject(AccessService);
  private readonly debitNotes = inject(DebitNoteService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly srn = signal<SupplierReturn | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = SUPPLIER_RETURN_SEVERITY;
  readonly closeDialogOpen = signal(false);
  readonly saving = signal(false);
  readonly closeError = signal<string | null>(null);
  refundAmount = '';

  readonly actions = computed<PageHeaderAction[]>(() => {
    const srn = this.srn();
    if (!srn) {
      return [];
    }
    // With accounting, an approved return can be claimed back from the supplier as a debit note.
    const claim: PageHeaderAction[] =
      srn.status !== 'draft' && this.access.hasModule('accounting')
        ? [{ label: 'returns.actions.raiseDebitNote', icon: 'pi pi-minus-circle', severity: 'secondary', onClick: () => this.raiseDebitNote() }]
        : [];
    switch (srn.status) {
      case 'draft':
        return [
          { label: 'returns.actions.approve', icon: 'pi pi-check', onClick: () => this.step('approve') },
          { label: 'common.delete', icon: 'pi pi-trash', severity: 'secondary', onClick: () => this.remove() },
        ];
      case 'approved':
        return [{ label: 'returns.actions.markShipped', icon: 'pi pi-truck', onClick: () => this.step('ship') }, ...claim];
      case 'shipped':
        return [{ label: 'returns.actions.confirmReceipt', icon: 'pi pi-flag', onClick: () => this.step('confirmReceipt') }, ...claim];
      case 'confirmed':
        return [{ label: 'returns.actions.closeSupplier', icon: 'pi pi-flag', onClick: () => this.openClose() }, ...claim];
      default:
        return claim;
    }
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.api.detail(this.id).subscribe({
      next: (srn) => this.srn.set(srn),
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/returns/supplier']);
  }

  submitClose(): void {
    const amount = this.refundAmount.trim();
    if (amount && !MONEY.test(amount)) {
      this.closeError.set('returns.hints.refundAmount');
      return;
    }
    this.closeError.set(null);
    this.saving.set(true);
    this.confirm.runAction(
      () => this.api.close(this.id, amount || null),
      'returns.toasts.closed',
      (srn) => {
        this.saving.set(false);
        this.closeDialogOpen.set(false);
        this.srn.set(srn);
      },
      () => this.saving.set(false),
    );
  }

  private openClose(): void {
    this.refundAmount = Number(this.srn()?.refund_amount ?? 0).toFixed(2);
    this.closeError.set(null);
    this.closeDialogOpen.set(true);
  }

  private step(name: 'approve' | 'ship' | 'confirmReceipt'): void {
    const keys = {
      approve: ['returns.confirm.approveSupplier', 'returns.actions.approve', 'returns.toasts.approved'],
      ship: ['returns.confirm.markShipped', 'returns.actions.markShipped', 'returns.toasts.shipped'],
      confirmReceipt: ['returns.confirm.confirmReceipt', 'returns.actions.confirmReceipt', 'returns.toasts.receiptConfirmed'],
    }[name];
    this.confirm.confirmAction({
      message: keys[0],
      accept: keys[1],
      success: keys[2],
      run: () => this.api[name](this.id),
      onDone: (srn) => this.srn.set(srn),
    });
  }

  /** A draft debit note for the return's value; the backend refuses a second one. */
  private raiseDebitNote(): void {
    this.confirm.confirmAction({
      message: 'returns.confirm.raiseDebitNote',
      accept: 'returns.actions.raiseDebitNote',
      success: 'returns.toasts.debitNoteCreated',
      run: () => this.debitNotes.fromSupplierReturn(this.id),
      onDone: (note) => void this.router.navigate(['/accounting/debit-notes', note.id]),
    });
  }

  private remove(): void {
    this.confirm.confirmDelete(this.srn()?.return_number ?? '', () => this.api.remove(this.id), () => this.goBack());
  }
}
