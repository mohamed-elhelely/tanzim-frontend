import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FormDialogService } from '../../../../shared/forms/form-dialog.service';
import { ServerTable } from '../../../../shared/table/server-table';
import { errorTitleKey } from '../../../../shared/utils/server-errors';
import { TenantCompanyService } from '../../companies/tenant-company.service';
import { AdminInvoice, INVOICE_SEVERITY, INVOICE_STATUSES, Severity } from '../platform-billing.models';
import { AdminInvoiceService } from '../platform-billing.service';
import { InvoiceDraftFormComponent } from './invoice-draft-form.component';

/** /admin/invoices: platform invoices of every company, filtered by company and status. */
@Component({
  selector: 'app-invoice-list',
  imports: [
    DecimalPipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    SelectModule,
    TableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-list.component.html',
})
export class InvoiceListComponent implements OnInit {
  private readonly api = inject(AdminInvoiceService);
  private readonly companiesApi = inject(TenantCompanyService);
  private readonly formDialog = inject(FormDialogService);
  private readonly router = inject(Router);

  company: number | null = null;
  status: string | null = null;

  readonly table = new ServerTable<AdminInvoice>((query) => {
    const filters: Record<string, string | number> = {};
    if (this.company !== null) {
      filters['company'] = this.company;
    }
    if (this.status) {
      filters['status'] = this.status;
    }
    return this.api.list({ ...query, filters });
  });
  readonly errorTitleKey = errorTitleKey;
  /** Keyed by string: table rows are untyped in the template. */
  readonly severity: Record<string, Severity> = INVOICE_SEVERITY;
  readonly statusOptions = INVOICE_STATUSES.map((status) => ({ value: status, label: `billing.invoiceStatus.${status}` }));
  readonly companyOptions = signal<Array<{ value: number; label: string }>>([]);
  readonly headerActions: PageHeaderAction[] = [
    { label: 'admin.billing.invoices.new', icon: 'pi pi-plus', onClick: () => this.formDialog.open(InvoiceDraftFormComponent, { header: 'admin.billing.invoices.new' }).subscribe() },
  ];

  ngOnInit(): void {
    this.companiesApi.all().subscribe({
      next: (companies) => this.companyOptions.set(companies.map((company) => ({ value: company.id, label: company.name }))),
      error: () => this.companyOptions.set([]),
    });
    this.table.load();
  }

  onFilterChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  open(row: AdminInvoice): void {
    void this.router.navigate(['/admin/billing/invoices', row.id]);
  }
}
