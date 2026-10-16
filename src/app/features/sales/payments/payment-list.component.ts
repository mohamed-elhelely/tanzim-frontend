import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ChoiceFilterComponent } from '../../../shared/table/choice-filter.component';
import { DateRangeFilterComponent } from '../../../shared/table/date-range-filter.component';
import { FilterErrorsComponent } from '../../../shared/table/filter-errors.component';
import { ServerTable, splitFilter } from '../../../shared/table/server-table';

import { InvoicePayment, PAYMENT_METHODS, PAYMENT_RECORD_SEVERITY, PaymentMethod, PaymentRecordStatus } from '../sales.models';
import { InvoicePaymentService } from './invoice-payment.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';

/** Every payment received, newest first. Payments are recorded and refunded from their invoice. */
@Component({
  selector: 'app-payment-list',
  imports: [
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    ChoiceFilterComponent,
    DateRangeFilterComponent,
    FilterErrorsComponent,
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

  method: PaymentMethod[] = [];
  dateFrom = '';
  dateTo = '';
  readonly table = new ServerTable<InvoicePayment>(
    (query) => this.api.list(query),
    {
      filters: () => ({ payment_method: this.method, date_from: this.dateFrom, date_to: this.dateTo }),
      reset: () => {
        this.method = [];
        this.dateFrom = '';
        this.dateTo = '';
      },
      restore: (filters) => {
        this.method = splitFilter(filters['payment_method']) as PaymentListComponent['method'];
        this.dateFrom = String(filters['date_from'] ?? '');
        this.dateTo = String(filters['date_to'] ?? '');
      },
    },
  );
  readonly methodOptions = PAYMENT_METHODS.map((method) => ({ value: method, label: `sales.paymentMethods.${method}` }));

  ngOnInit(): void {
    this.table.load();
  }

  statusSeverity(status: PaymentRecordStatus) {
    return PAYMENT_RECORD_SEVERITY[status] ?? 'secondary';
  }

  openInvoice(row: InvoicePayment): void {
    void this.router.navigate(['/sales/invoices', row.invoice]);
  }
}
