import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../../core/auth/access.service';
import { ConfirmService } from '../../../core/services/confirm.service';
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
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';

/** Invoices are created from a delivered order ("Create invoice"), so this list has no New button. */
@Component({
  selector: 'app-sales-invoice-list',
  imports: [
    SavedViewsComponent,
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
  private readonly access = inject(AccessService);
  private readonly confirm = inject(ConfirmService);

  status: SalesInvoiceStatus | null = null;
  paymentStatus: InvoicePaymentStatus | null = null;
  readonly table = new ServerTable<SalesInvoiceListItem>(
    (query) => this.api.list(query),
    {
      filters: () => ({ status: this.status, payment_status: this.paymentStatus }),
      reset: () => {
        this.status = null;
        this.paymentStatus = null;
      },
      restore: (filters) => {
        this.status = (filters['status'] ?? null) as SalesInvoiceListComponent['status'];
        this.paymentStatus = (filters['payment_status'] ?? null) as SalesInvoiceListComponent['paymentStatus'];
      },
    },
  );

  /** Ticking rows is for acting on several drafts at once. */
  readonly canBulk = computed(() => this.access.can('change_salesinvoice'));
  /** The ticked rows the bulk action applies to (drafts only). */
  readonly selectedDrafts = computed(() => this.table.selection().filter((row) => row.status === 'draft'));
  readonly errorTitleKey = errorTitleKey;
  readonly statusOptions = INVOICE_STATUSES.map((status) => ({ value: status, label: `sales.invoiceStatuses.${status}` }));
  readonly paymentOptions = PAYMENT_STATUSES.map((status) => ({ value: status, label: `sales.paymentStatuses.${status}` }));

  ngOnInit(): void {
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

  issueSelected(): void {
    this.confirm.confirmBulk({
      rows: this.selectedDrafts(),
      message: 'sales.confirm.issueInvoices',
      accept: 'sales.actions.issueInvoice',
      success: 'sales.toasts.invoicesIssued',
      run: (row: SalesInvoiceListItem) => this.api.issue(row.id),
      onDone: () => this.table.load(),
    });
  }
}
