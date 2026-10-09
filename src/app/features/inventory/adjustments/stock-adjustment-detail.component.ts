import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import { CardModule } from 'primeng/card';
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
import { ADJUSTMENT_STATUS_SEVERITY, StockAdjustment, StockAdjustmentLine } from '../inventory.models';
import { StockAdjustmentLineService } from './stock-adjustment-line.service';
import { StockAdjustmentService } from './stock-adjustment.service';

/**
 * One adjustment and its workflow: submit → approve (or reject back to draft) → post, which writes the differences
 * to the stock ledger. Edit and delete while it is a draft.
 */
@Component({
  selector: 'app-stock-adjustment-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    TranslatePipe,
    CardModule,
    TableModule,
    PageHeaderComponent,
    ReasonDialogComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    UserNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './stock-adjustment-detail.component.html',
})
export class StockAdjustmentDetailComponent implements OnInit {
  private readonly api = inject(StockAdjustmentService);
  private readonly linesApi = inject(StockAdjustmentLineService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly adjustment = signal<StockAdjustment | null>(null);
  readonly lines = signal<StockAdjustmentLine[]>([]);
  readonly loadError = signal<AppError | null>(null);
  readonly rejectDialogOpen = signal(false);
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = ADJUSTMENT_STATUS_SEVERITY;
  /** Net value of the adjustment: what the stock gains (positive) or loses at the lines' unit cost. */
  readonly totalValue = computed(() =>
    this.lines().reduce((sum, line) => sum + Number(line.difference) * Number(line.unit_cost ?? 0), 0),
  );

  readonly actions = computed<PageHeaderAction[]>(() => {
    const adjustment = this.adjustment();
    if (!adjustment) {
      return [];
    }
    switch (adjustment.status) {
      case 'draft':
        return [
          { label: 'common.edit', icon: 'pi pi-pencil', severity: 'secondary', onClick: () => this.edit() },
          { label: 'inventory.movements.submit', icon: 'pi pi-send', onClick: () => this.submitForApproval() },
          { label: 'common.delete', icon: 'pi pi-trash', severity: 'secondary', onClick: () => this.remove() },
        ];
      case 'pending':
        return [
          { label: 'inventory.movements.approve', icon: 'pi pi-check', onClick: () => this.approve() },
          { label: 'inventory.movements.reject', icon: 'pi pi-undo', severity: 'secondary', onClick: () => this.rejectDialogOpen.set(true) },
        ];
      case 'approved':
        return [{ label: 'inventory.adjustments.post', icon: 'pi pi-check-circle', onClick: () => this.postToStock() }];
      default:
        return [];
    }
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    forkJoin({ adjustment: this.api.retrieve(this.id), lines: this.linesApi.forAdjustment(this.id) }).subscribe({
      next: ({ adjustment, lines }) => {
        this.adjustment.set(adjustment);
        this.lines.set(lines);
      },
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/inventory/adjustments']);
  }

  onRejectConfirmed(reason: string): void {
    this.confirm.runAction(
      () => this.api.reject(this.id, reason),
      'inventory.movements.toasts.rejected',
      (adjustment) => {
        this.rejectDialogOpen.set(false);
        this.adjustment.set(adjustment);
      },
    );
  }

  private edit(): void {
    void this.router.navigate(['/inventory/adjustments', this.id, 'edit']);
  }

  private submitForApproval(): void {
    this.confirm.confirmAction({
      message: 'inventory.adjustments.confirm.submit',
      accept: 'inventory.movements.submit',
      success: 'inventory.movements.toasts.submitted',
      run: () => this.api.submit(this.id),
      onDone: (adjustment) => this.adjustment.set(adjustment),
    });
  }

  private approve(): void {
    this.confirm.confirmAction({
      message: 'inventory.adjustments.confirm.approve',
      accept: 'inventory.movements.approve',
      success: 'inventory.movements.toasts.approved',
      run: () => this.api.approve(this.id),
      onDone: (adjustment) => this.adjustment.set(adjustment),
    });
  }

  private postToStock(): void {
    this.confirm.confirmAction({
      message: 'inventory.adjustments.confirm.post',
      accept: 'inventory.adjustments.post',
      success: 'inventory.adjustments.toasts.posted',
      run: () => this.api.postToStock(this.id),
      onDone: (adjustment) => this.adjustment.set(adjustment),
    });
  }

  private remove(): void {
    this.confirm.confirmDelete(this.adjustment()?.adjustment_number ?? '', () => this.api.remove(this.id), () => this.goBack());
  }
}
