import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FormDialogService } from '../../../../shared/forms/form-dialog.service';
import { ServerTable } from '../../../../shared/table/server-table';
import { errorTitleKey } from '../../../../shared/utils/server-errors';
import { TenantCompanyService } from '../../companies/tenant-company.service';
import { SUBSCRIPTION_SEVERITY, SUBSCRIPTION_STATUSES, Severity, Subscription } from '../platform-billing.models';
import { SubscriptionService } from '../platform-billing.service';
import { SubscriptionFormComponent } from './subscription-form.component';
import { SubscriptionModulesComponent } from './subscription-modules.component';

/**
 * /admin/subscriptions: every company's subscription, filtered by company and status; plan, dates and users are
 * edited in a dialog, modules switched on and off in another.
 */
@Component({
  selector: 'app-subscription-list',
  imports: [
    FormsModule,
    TranslatePipe,
    ButtonModule,
    DialogModule,
    SelectModule,
    TableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    SubscriptionModulesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-list.component.html',
})
export class SubscriptionListComponent implements OnInit {
  private readonly api = inject(SubscriptionService);
  private readonly companiesApi = inject(TenantCompanyService);
  private readonly formDialog = inject(FormDialogService);
  private readonly confirm = inject(ConfirmService);
  private readonly companyNames = signal<ReadonlyMap<number, string>>(new Map());

  company: number | null = null;
  status: string | null = null;

  readonly table = new ServerTable<Subscription>((query) => {
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
  readonly severity: Record<string, Severity> = SUBSCRIPTION_SEVERITY;
  readonly statusOptions = SUBSCRIPTION_STATUSES.map((status) => ({ value: status, label: `billing.subscriptionStatus.${status}` }));
  readonly companyOptions = computed(() => [...this.companyNames()].map(([value, label]) => ({ value, label })));
  readonly headerActions: PageHeaderAction[] = [
    { label: 'admin.billing.subscriptions.new', icon: 'pi pi-plus', onClick: () => this.openForm() },
  ];

  /** The subscription whose modules dialog is open. */
  readonly modulesFor = signal<Subscription | null>(null);

  ngOnInit(): void {
    this.companiesApi.all().subscribe({
      next: (companies) => this.companyNames.set(new Map(companies.map((company) => [company.id, company.name]))),
      error: () => this.companyNames.set(new Map()),
    });
    this.table.load();
  }

  companyName(row: Subscription): string {
    return row.company_name || `#${row.company}`;
  }

  onFilterChange(): void {
    this.table.first.set(0);
    this.table.load();
  }

  /** Create (no id) or edit in a dialog over the list; the list reloads after a save. */
  openForm(id?: number): void {
    this.formDialog
      .open(SubscriptionFormComponent, { header: id ? 'admin.billing.subscriptions.edit' : 'admin.billing.subscriptions.new', id })
      .subscribe(() => this.table.load());
  }

  openModules(row: Subscription): void {
    this.modulesFor.set(row);
  }

  confirmDelete(row: Subscription): void {
    this.confirm.confirmDelete(`${this.companyName(row)} — ${row.plan_name}`, () => this.api.remove(row.id), () => this.table.afterDelete());
  }
}
