import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NAV_ITEMS, NavItem } from '../../../layout/nav/nav-items';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { UserNamePipe } from '../../../shared/pipes/user-name.pipe';
import { ServerTable, splitFilter } from '../../../shared/table/server-table';
import { datedFileName, saveFile } from '../../../shared/utils/save-file';

import { SelectOption } from '../company.models';
import { TenantCompanyService } from '../../admin/companies/tenant-company.service';
import { CompanyUserService } from '../users/company-user.service';
import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_SEVERITY,
  AUDIT_SOURCES,
  AuditAction,
  AuditLogEntry,
  AuditSeverity,
  AuditSource,
  auditChangeRows,
  auditCompanyLabel,
  auditMetaRows,
} from './system-log.models';
import { SystemLogService } from './system-log.service';
import { RowActionComponent, RowActionsComponent } from '../../../shared/table/row-actions.component';
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';
import { AppDatePipe } from '../../../shared/pipes/app-date.pipe';
import { MultiSelectComponent } from '../../../shared/ui/multi-select/multi-select.component';
import { SelectComponent } from '../../../shared/ui/select/select.component';
import { ButtonComponent } from '../../../shared/ui/button/button.component';
import { TableComponent } from '../../../shared/ui/table/table.component';
import { TableEmptyDirective, TableHeaderDirective, TableRowDirective } from '../../../shared/ui/table/table-templates';
import { SortableHeaderComponent } from '../../../shared/ui/table/sortable-header.component';

/**
 * Resources the log records that have no screen of their own (document lines, sign-ins on the user, stock
 * reservations), or whose screen is named for something else. They get their own labels and win over the menu.
 */
const AUDIT_EXTRA_RESOURCES = ['user', 'companyuser', 'salesorderline', 'deliverynoteline', 'journalline', 'stockreservation'];

/** The resource filter's options and labels: every screen's `view_<resource>`, plus AUDIT_EXTRA_RESOURCES. */
function auditResourceLabels(items: NavItem[]): Map<string, string> {
  const labels = resourceLabels(items);
  for (const resource of AUDIT_EXTRA_RESOURCES) {
    labels.set(resource, `systemLogs.resources.${resource}`);
  }
  return labels;
}

/** Screens' `view_<resource>` permissions give the resource filter its options and labels (nav.* keys). */
function resourceLabels(items: NavItem[]): Map<string, string> {
  const labels = new Map<string, string>();
  for (const item of items) {
    if (item.permission?.startsWith('view_')) {
      labels.set(item.permission.slice('view_'.length), item.labelKey);
    }
    resourceLabels(item.children ?? []).forEach((label, resource) => labels.set(resource, label));
  }
  return labels;
}

/**
 * Who changed what and when, newest first: every create, update and delete on company data, plus sign-ins.
 * A row opens a drawer with the field changes (before → after) and where the change came from.
 *
 * Company users see their company (`/company/system-logs`); platform staff see every company and can filter by
 * one (`/admin/system-logs`). Staff have no company, so they get the company filter instead of the user filter.
 *
 * With `scope` (a module's audit resources) it is a module's activity log, shown in the activity drawer: always
 * limited to those resources, without the page header, the resource filter or saved views.
 */
@Component({
  selector: 'app-system-log-list',
  imports: [
    SortableHeaderComponent,
    TableEmptyDirective,
    TableRowDirective,
    TableHeaderDirective,
    TableComponent,
    ButtonComponent,
    SelectComponent,
    MultiSelectComponent,
    RowActionsComponent,
    RowActionComponent,
    SavedViewsComponent,
    AppDatePipe,
    FormsModule,
    TranslatePipe,
    DrawerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    UserNamePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './system-log-list.component.html',
})
export class SystemLogListComponent implements OnInit {
  private readonly api = inject(SystemLogService);
  private readonly users = inject(CompanyUserService);
  private readonly companies = inject(TenantCompanyService);
  private readonly notifications = inject(NotificationService);
  readonly language = inject(LanguageService);
  readonly staff = inject(AccessService).isStaff;
  /** A module's audit resources: every request is limited to them (not a filter the user can clear). */
  readonly scope = input<readonly string[] | null>(null);
  /** With `scope`: only this record's log (a row's "View logs"). */
  readonly objectId = input<string | number | null | undefined>(null);

  actions: AuditAction[] = [];
  resources: string[] = [];
  sources: AuditSource[] = [];
  user: number | null = null;
  company: number | null = null;
  dateFrom = '';
  dateTo = '';

  readonly table = new ServerTable<AuditLogEntry>(
    (query) => this.api.list({ ...query, ordering: query.ordering ?? '-timestamp', filters: this.scoped(query.filters) }),
    {
      filters: () => ({
        action: this.actions,
        resource: this.resources,
        source: this.sources,
        user: this.user,
        company: this.company,
        date_from: this.dateFrom,
        date_to: this.dateTo,
      }),
      reset: () => {
        this.actions = [];
        this.resources = [];
        this.sources = [];
        this.user = null;
        this.company = null;
        this.dateFrom = '';
        this.dateTo = '';
      },
      restore: (filters) => {
        this.actions = splitFilter(filters['action']) as AuditAction[];
        this.resources = splitFilter(filters['resource']);
        this.sources = splitFilter(filters['source']) as AuditSource[];
        this.user = filters['user'] === undefined ? null : Number(filters['user']);
        this.company = filters['company'] === undefined ? null : Number(filters['company']);
        this.dateFrom = String(filters['date_from'] ?? '');
        this.dateTo = String(filters['date_to'] ?? '');
      },
    },
  );

  private readonly resourceLabelKeys = auditResourceLabels(NAV_ITEMS);
  private readonly actionKeys = AUDIT_ACTIONS.map((action) => [action, `systemLogs.actions.${action}`] as const);
  private readonly sourceKeys = AUDIT_SOURCES.map((source) => [source, `systemLogs.sources.${source}`] as const);
  // The multi-selects show (and search) translated labels, so they follow the language.
  private readonly labels = toSignal(
    inject(TranslateService).stream([
      ...this.resourceLabelKeys.values(),
      ...this.actionKeys.map(([, key]) => key),
      ...this.sourceKeys.map(([, key]) => key),
    ]),
    { initialValue: {} as Record<string, string> },
  );
  readonly resourceOptions = computed(() => this.options([...this.resourceLabelKeys]));
  readonly actionOptions = computed(() => this.options(this.actionKeys));
  readonly sourceOptions = computed(() => this.options(this.sourceKeys));
  readonly userOptions = signal<SelectOption[]>([]);
  readonly companyOptions = signal<SelectOption[]>([]);
  private readonly companyNames = computed(
    () => new Map(this.companyOptions().map((option) => [Number(option.value), option.label])),
  );

  readonly exporting = signal(false);
  readonly headerActions = computed<PageHeaderAction[]>(() => [
    {
      label: 'systemLogs.export',
      icon: this.exporting() ? 'pi pi-spin pi-spinner' : 'pi pi-file-excel',
      severity: 'secondary',
      disabled: this.exporting(),
      onClick: () => this.export(),
    },
  ]);

  /** The row shown in the drawer: the list row at once, then the full entry from `logs/{id}/`. */
  readonly selected = signal<AuditLogEntry | null>(null);
  readonly loadingDetail = signal(false);
  readonly changeRows = auditChangeRows;
  readonly metaRows = auditMetaRows;

  ngOnInit(): void {
    this.table.load();
    // The user and company filters are optional: without their dropdowns the rest of the screen still works.
    if (this.staff()) {
      this.companies.all().subscribe({
        next: (companies) => this.companyOptions.set(companies.map((c) => ({ value: c.id, label: c.name }))),
        error: () => undefined,
      });
    } else {
      this.users.userOptions().subscribe({ next: (options) => this.userOptions.set(options), error: () => undefined });
    }
  }

  private scoped(filters: Record<string, string | number> | undefined): Record<string, string | number> {
    const scope = this.scope();
    if (!scope) {
      return { ...filters };
    }
    const objectId = this.objectId();
    return {
      ...filters,
      resource: scope.join(','),
      ...(objectId === null || objectId === undefined ? {} : { object_id: String(objectId) }),
    };
  }

  private options(entries: readonly (readonly [string, string])[]): { value: string; label: string }[] {
    const labels = this.labels();
    return entries.map(([value, key]) => ({ value, label: labels[key] ?? key }));
  }

  companyLabel(company: AuditLogEntry['company']): string {
    return auditCompanyLabel(company, this.companyNames());
  }

  resourceLabel(resource: string): string {
    return this.resourceLabelKeys.get(resource) ?? resource;
  }

  actionSeverity(action: AuditAction): AuditSeverity {
    return AUDIT_ACTION_SEVERITY[action] ?? 'secondary';
  }

  /** Downloads what the table shows: the applied search and filters, not half-edited ones. */
  export(): void {
    this.exporting.set(true);
    this.api.exportXlsx(this.table.appliedQuery()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        saveFile(blob, datedFileName('system-log', 'xlsx'));
      },
      error: (error: AppError) => {
        this.exporting.set(false);
        this.notifications.error(error.message);
      },
    });
  }

  open(row: AuditLogEntry): void {
    this.selected.set(row);
    this.loadingDetail.set(true);
    // If the full entry can't be loaded, the row already shown is enough.
    this.api.retrieve(row.id).subscribe({
      next: (entry) => {
        if (this.selected()?.id === row.id) {
          this.selected.set(entry);
          this.loadingDetail.set(false);
        }
      },
      error: () => {
        if (this.selected()?.id === row.id) {
          this.loadingDetail.set(false);
        }
      },
    });
  }

  close(): void {
    this.selected.set(null);
    this.loadingDetail.set(false);
  }
}
