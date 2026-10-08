import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../../shared/table/server-table';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_SEVERITY,
  InvoicePaymentStatus,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_SEVERITY,
  SalesInvoiceListItem,
  SalesInvoiceStatus,
} from '../sales.models';
import { SalesInvoiceService } from './sales-invoice.service';

/** Invoices are created from a delivered order ("Create invoice"), so this list has no New button. */
@Component({
  selector: 'app-sales-invoice-list',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
    SelectModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sales-invoice-list.component.html',
})
export class SalesInvoiceListComponent implements OnInit {
  private readonly api = inject(SalesInvoiceService);
  private readonly router = inject(Router);

  status: SalesInvoiceStatus | null = null;
  paymentStatus: InvoicePaymentStatus | null = null;
  readonly table = new ServerTable<SalesInvoiceListItem>((query) => {
    const filters: Record<string, string> = {};
    if (this.status) {
      filters['status'] = this.status;
    }
    if (this.paymentStatus) {
      filters['payment_status'] = this.paymentStatus;
    }
    return this.api.list({ ...query, filters });
  });
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = INVOICE_STATUSES.map((status) => ({ value: status, label: `sales.invoiceStatuses.${status}` }));
  readonly paymentOptions = PAYMENT_STATUSES.map((status) => ({ value: status, label: `sales.paymentStatuses.${status}` }));

  ngOnInit(): void {
    this.table.load();
  }

  onFilterChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  statusSeverity(status: SalesInvoiceStatus) {
    return INVOICE_STATUS_SEVERITY[status] ?? 'secondary';
  }

  paymentSeverity(status: InvoicePaymentStatus) {
    return PAYMENT_STATUS_SEVERITY[status] ?? 'secondary';
  }

  open(row: SalesInvoiceListItem): void {
    void this.router.navigate(['/sales/invoices', row.id]);
  }
}
