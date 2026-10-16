import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../core/auth/access.service';
import { AppError } from '../../core/errors/app-error';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../shared/table/server-table';

import { saveFile } from '../../shared/utils/save-file';
import { ImportExportActionsComponent } from './import-export-actions.component';
import { DATA_RESOURCES, DataResource, DataTask, TaskStatus, taskModelName } from './import-export.models';
import { RowActionComponent, RowActionsComponent } from '../../shared/table/row-actions.component';
import { ImportExportService } from './import-export.service';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { CardComponent } from '../../shared/ui/card/card.component';
import { SelectComponent } from '../../shared/ui/select/select.component';
import { SelectGroupDirective, SelectItemDirective, SelectSelectedDirective } from '../../shared/ui/select/select-templates';
import { ButtonComponent } from '../../shared/ui/button/button.component';

type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

const TASK_SEVERITY: Record<TaskStatus, Severity> = {
  pending: 'secondary',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
};

/**
 * Import and export for every resource the backend supports, on one page, plus the background task history.
 * The buttons are the same ImportExportActionsComponent the list pages show next to their Create button; this page
 * also reaches resources without a list page (product attributes, batches, serial numbers).
 */
@Component({
  selector: 'app-import-export-page',
  imports: [
    ButtonComponent,
    SelectGroupDirective,
    SelectSelectedDirective,
    SelectItemDirective,
    SelectComponent,
    CardComponent,
    RowActionsComponent,
    RowActionComponent,
    AppDatePipe,
    FormsModule,
    TranslatePipe,
    TableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
    ImportExportActionsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-export-page.component.html',
})
export class ImportExportPageComponent implements OnInit {
  private readonly api = inject(ImportExportService);
  private readonly access = inject(AccessService);
  private readonly notifications = inject(NotificationService);

  /** Resources this user may see: by subscription module and, for company data, by permission. */
  readonly resources = computed(() =>
    DATA_RESOURCES.filter(
      (resource) => (!resource.module || this.access.hasModule(resource.module)) && (!resource.permission || this.access.can(resource.permission)),
    ),
  );
  readonly resourceOptions = computed(() =>
    (['company', 'locations', 'inventory'] as const)
      .map((group) => ({
        label: `importExport.groups.${group}`,
        items: this.resources()
          .filter((resource) => resource.group === group)
          .map((resource) => ({ label: `importExport.resources.${resource.key}`, value: resource.key })),
      }))
      .filter((group) => group.items.length > 0),
  );

  readonly selectedKey = signal<string | null>(null);
  readonly selected = computed<DataResource | null>(() => this.resources().find((resource) => resource.key === this.selectedKey()) ?? null);

  taskType: 'import' | 'export' | null = null;
  readonly tasks = new ServerTable<DataTask>(
    (query) => this.api.tasks(query.page, query.pageSize, (query.filters?.['type'] as 'import' | 'export' | undefined) ?? null),
    {
      filters: () => ({ type: this.taskType }),
      reset: () => {
        this.taskType = null;
      },
    },
  );
  readonly typeOptions = (['import', 'export'] as const).map((type) => ({ value: type, label: `importExport.taskTypes.${type}` }));
  readonly modelName = taskModelName;

  ngOnInit(): void {
    this.tasks.load();
  }

  onResourceChange(key: string | null): void {
    this.selectedKey.set(key);
  }

  taskSeverity(status: TaskStatus): Severity {
    return TASK_SEVERITY[status] ?? 'secondary';
  }

  downloadTask(task: DataTask): void {
    if (!task.download_url) {
      return;
    }
    this.api.download(task.download_url).subscribe({
      next: (blob) => saveFile(blob, task.filename ?? 'export'),
      error: (error: AppError) => {
        // Network and 5xx errors were already shown by the interceptor.
        if (error.status >= 400 && error.status < 500) {
          this.notifications.error(error.message);
        }
      },
    });
  }

  taskErrors(task: DataTask): string {
    const details = task.error_rows?.detailed_errors ?? [];
    if (details.length) {
      return details
        .slice(0, 3)
        .map((detail) => `#${detail.row}: ${detail.error}`)
        .join(' · ');
    }
    return task.error_rows?.import_error ?? '';
  }
}
