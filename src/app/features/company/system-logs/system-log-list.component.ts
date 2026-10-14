import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
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
import { ServerTable } from '../../../shared/table/server-table';
import { saveFile } from '../../../shared/utils/save-file';
import { errorTitleKey } from '../../../shared/utils/server-errors';
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
import { SavedViewsComponent } from '../../../shared/table/saved-views.component';

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

/** A comma-separated filter value (as saved views keep it) back into the list a multi-select holds. */
function splitList(value: string | number | undefined): string[] {
  return value === undefined || value === '' ? [] : String(value).split(',');
}

/**
 * Who changed what and when, newest first: every create, update and delete on company data, plus sign-ins.
 * A row opens a drawer with the field changes (before → after) and where the change came from.
 *
 * Company users see their company (`/company/system-logs`); platform staff see every company and can filter by
 * one (`/admin/system-logs`). Staff have no company, so they get the company filter instead of the user filter.
 */
@Component({
  selector: 'app-system-log-list',
  imports: [
    SavedViewsComponent,
    DatePipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    ButtonModule,
    DrawerModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    MultiSelectModule,
    SelectModule,
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

  actions: AuditAction[] = [];
  resources: string[] = [];
  sources: AuditSource[] = [];
  user: number | null = null;
  company: number | null = null;
  dateFrom = '';
  dateTo = '';

  readonly table = new ServerTable<AuditLogEntry>(
    (query) => this.api.list({ ...query, ordering: query.ordering ?? '-timestamp' }),
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
        this.actions = splitList(filters['action']) as AuditAction[];
        this.resources = splitList(filters['resource']);
        this.sources = splitList(filters['source']) as AuditSource[];
        this.user = filters['user'] === undefined ? null : Number(filters['user']);
        this.company = filters['company'] === undefined ? null : Number(filters['company']);
        this.dateFrom = String(filters['date_from'] ?? '');
        this.dateTo = String(filters['date_to'] ?? '');
      },
    },
  );
  readonly errorTitleKey = errorTitleKey;

  private readonly resourceLabelKeys = resourceLabels(NAV_ITEMS);
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
        saveFile(blob, `system-log_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
