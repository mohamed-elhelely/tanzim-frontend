import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { InvoicePayment, PAYMENT_METHODS, PAYMENT_RECORD_SEVERITY, PaymentMethod, PaymentRecordStatus } from '../sales.models';
import { InvoicePaymentService } from './invoice-payment.service';

/** Every payment received, newest first. Payments are recorded and refunded from their invoice. */
@Component({
  selector: 'app-payment-list',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    SelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './payment-list.component.html',
})
export class PaymentListComponent implements OnInit {
  private readonly api = inject(InvoicePaymentService);
  private readonly router = inject(Router);

  method: PaymentMethod | null = null;
  readonly table = new ServerTable<InvoicePayment>((query) =>
    this.api.list({ ...query, filters: this.method ? { payment_method: this.method } : {} }),
  );
  readonly errorTitleKey = errorTitleKey;
  readonly methodOptions = PAYMENT_METHODS.map((method) => ({ value: method, label: `sales.paymentMethods.${method}` }));

  ngOnInit(): void {
    this.table.load();
  }

  onMethodChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  statusSeverity(status: PaymentRecordStatus) {
    return PAYMENT_RECORD_SEVERITY[status] ?? 'secondary';
  }

  openInvoice(row: InvoicePayment): void {
    void this.router.navigate(['/sales/invoices', row.invoice]);
  }
}
