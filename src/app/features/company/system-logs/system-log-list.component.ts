import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DrawerModule } from 'primeng/drawer';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { LanguageService } from '../../../core/services/language.service';
import { NAV_ITEMS, NavItem } from '../../../layout/nav/nav-items';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { UserNamePipe } from '../../../shared/pipes/user-name.pipe';
import { ServerTable } from '../../../shared/table/server-table';
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
    },
  );
  readonly errorTitleKey = errorTitleKey;

  private readonly resourceLabelKeys = resourceLabels(NAV_ITEMS);
  readonly resourceOptions = [...this.resourceLabelKeys].map(([value, label]) => ({ value, label }));
  readonly actionOptions = AUDIT_ACTIONS.map((action) => ({ value: action, label: `systemLogs.actions.${action}` }));
  readonly sourceOptions = AUDIT_SOURCES.map((source) => ({ value: source, label: `systemLogs.sources.${source}` }));
  readonly userOptions = signal<SelectOption[]>([]);

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

  open(row: AuditLogEntry): void {
    this.selected.set(row);
  }

  close(): void {
    this.selected.set(null);
  }
}
