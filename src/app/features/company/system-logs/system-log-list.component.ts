import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
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

/**
 * Who changed what and when, newest first: every create, update and delete on company data, plus sign-ins.
 * A row opens a drawer with the field changes (before → after) and where the change came from.
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
  private readonly notifications = inject(NotificationService);
  readonly language = inject(LanguageService);

  action: AuditAction | null = null;
  resource: string | null = null;
  user: number | null = null;
  source: AuditSource | null = null;
  dateFrom = '';
  dateTo = '';

  readonly table = new ServerTable<AuditLogEntry>(
    (query) => this.api.list({ ...query, ordering: query.ordering ?? '-timestamp' }),
    {
      filters: () => ({
        action: this.action,
        resource: this.resource,
        user: this.user,
        source: this.source,
        date_from: this.dateFrom,
        date_to: this.dateTo,
      }),
      reset: () => {
        this.action = null;
        this.resource = null;
        this.user = null;
        this.source = null;
        this.dateFrom = '';
        this.dateTo = '';
      },
      restore: (filters) => {
        this.action = (filters['action'] ?? null) as SystemLogListComponent['action'];
        this.resource = (filters['resource'] ?? null) as SystemLogListComponent['resource'];
        this.user = filters['user'] === undefined ? null : Number(filters['user']);
        this.source = (filters['source'] ?? null) as SystemLogListComponent['source'];
        this.dateFrom = String(filters['date_from'] ?? '');
        this.dateTo = String(filters['date_to'] ?? '');
      },
    },
  );
  readonly errorTitleKey = errorTitleKey;

  private readonly resourceLabelKeys = resourceLabels(NAV_ITEMS);
  readonly resourceOptions = [...this.resourceLabelKeys].map(([value, label]) => ({ value, label }));
  readonly actionOptions = AUDIT_ACTIONS.map((action) => ({ value: action, label: `systemLogs.actions.${action}` }));
  readonly sourceOptions = AUDIT_SOURCES.map((source) => ({ value: source, label: `systemLogs.sources.${source}` }));
  readonly userOptions = signal<SelectOption[]>([]);

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

  /** The row shown in the drawer. */
  readonly selected = signal<AuditLogEntry | null>(null);
  readonly changeRows = auditChangeRows;

  ngOnInit(): void {
    this.table.load();
    // The user filter is optional: without the dropdown the rest of the screen still works.
    this.users.userOptions().subscribe({ next: (options) => this.userOptions.set(options), error: () => undefined });
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
  }

  close(): void {
    this.selected.set(null);
  }
}
