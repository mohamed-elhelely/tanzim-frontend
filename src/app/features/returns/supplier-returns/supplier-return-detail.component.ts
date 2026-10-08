import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { SUPPLIER_RETURN_SEVERITY, SupplierReturn } from '../returns.models';
import { SupplierReturnService } from './supplier-return.service';

/** One supplier return: draft → approve (stock leaves) → shipped → confirmed by the supplier. */
@Component({
  selector: 'app-supplier-return-detail',
  imports: [
    DecimalPipe,
    RouterLink,
    TranslatePipe,
    CardModule,
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

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly srn = signal<SupplierReturn | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = SUPPLIER_RETURN_SEVERITY;

  /** Sum of the lines (the backend's refund_amount stays 0, BACKEND_REQUESTS 19). */
  readonly linesTotal = computed(() => (this.srn()?.lines ?? []).reduce((sum, line) => sum + Number(line.line_total), 0));

  readonly actions = computed<PageHeaderAction[]>(() => {
    const srn = this.srn();
    if (!srn) {
      return [];
    }
    switch (srn.status) {
      case 'draft':
        return [
          { label: 'returns.actions.approve', icon: 'pi pi-check', onClick: () => this.step('approve') },
          { label: 'common.delete', icon: 'pi pi-trash', severity: 'secondary', onClick: () => this.remove() },
        ];
      case 'approved':
        return [{ label: 'returns.actions.markShipped', icon: 'pi pi-truck', onClick: () => this.step('ship') }];
      case 'shipped':
        return [{ label: 'returns.actions.confirmReceipt', icon: 'pi pi-flag', onClick: () => this.step('confirmReceipt') }];
      default:
        return [];
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

  private remove(): void {
    this.confirm.confirmDelete(this.srn()?.return_number ?? '', () => this.api.remove(this.id), () => this.goBack());
  }
}
