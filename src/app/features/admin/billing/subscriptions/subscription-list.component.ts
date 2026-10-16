import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { FormDialogService } from '../../../../shared/forms/form-dialog.service';
import { ServerTable } from '../../../../shared/table/server-table';

import { TenantCompanyService } from '../../companies/tenant-company.service';
import { SUBSCRIPTION_SEVERITY, SUBSCRIPTION_STATUSES, Severity, Subscription } from '../platform-billing.models';
import { SubscriptionService } from '../platform-billing.service';
import { SubscriptionFormComponent } from './subscription-form.component';
import { SubscriptionModulesComponent } from './subscription-modules.component';
import { RowActionComponent, RowActionsComponent } from '../../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../../shared/table/saved-views.component';
import { DialogComponent } from '../../../../shared/ui/dialog/dialog.component';
import { SelectComponent } from '../../../../shared/ui/select/select.component';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';
import { TableComponent } from '../../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../../shared/ui/table/table-templates';

/**
 * /admin/subscriptions: every company's subscription, filtered by company and status; plan, dates and users are
 * edited in a dialog, modules switched on and off in another.
 */
@Component({
  selector: 'app-subscription-list',
  imports: [
    TableEmptyDirective,
    TableRowDirective,
    TableHeaderDirective,
    TableComponent,
    ButtonComponent,
    DialogComponent,
    SelectComponent,
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    FormsModule,
    TranslatePipe,
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

  readonly table = new ServerTable<Subscription>(
    (query) => this.api.list(query),
    {
      filters: () => ({ company: this.company, status: this.status }),
      reset: () => {
        this.company = null;
        this.status = null;
      },
      restore: (filters) => {
        this.company = filters['company'] === undefined ? null : Number(filters['company']);
        this.status = (filters['status'] ?? null) as SubscriptionListComponent['status'];
      },
    },
  );
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
