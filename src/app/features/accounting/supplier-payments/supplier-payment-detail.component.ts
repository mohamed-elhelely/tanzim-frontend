import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReasonDialogComponent } from '../../../shared/components/reason-dialog/reason-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { SupplierPayment } from '../accounting.models';
import { SupplierPaymentService } from './supplier-payment.service';

/** One supplier payment with its allocations. Completed payments can be voided (with a reason). */
@Component({
  selector: 'app-supplier-payment-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    TranslatePipe,
    CardModule,
    TableModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ReasonDialogComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './supplier-payment-detail.component.html',
})
export class SupplierPaymentDetailComponent implements OnInit {
  private readonly api = inject(SupplierPaymentService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly payment = signal<SupplierPayment | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly voidDialogOpen = signal(false);
  readonly errorTitleKey = errorTitleKey;

  readonly actions = computed<PageHeaderAction[]>(() =>
    this.payment()?.status === 'completed'
      ? [{ label: 'accounting.actions.void', icon: 'pi pi-ban', severity: 'danger', onClick: () => this.voidDialogOpen.set(true) }]
      : [],
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.api.retrieve(this.id).subscribe({
      next: (payment) => this.payment.set(payment),
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/accounting/supplier-payments']);
  }

  onVoidConfirmed(reason: string): void {
    this.confirm.runAction(
      () => this.api.void(this.id, reason),
      'accounting.toasts.paymentVoided',
      (payment) => {
        this.voidDialogOpen.set(false);
        this.payment.set(payment);
      },
    );
  }
}
