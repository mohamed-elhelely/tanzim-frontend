import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../core/auth/access.service';
import { AppError } from '../../core/errors/app-error';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { ServerTable } from '../../shared/table/server-table';
import { errorTitleKey } from '../../shared/utils/server-errors';
import { saveFile } from '../../shared/utils/save-file';
import { DATA_RESOURCES, DataResource, DataTask, ExportFormat, ImportResult, ImportRowStatus, TaskStatus, taskModelName } from './import-export.models';
import { ImportExportService, fileToDataUri } from './import-export.service';

type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

const ROW_SEVERITY: Record<ImportRowStatus, Severity> = {
  new: 'success',
  updated: 'info',
  errors: 'danger',
  skipped: 'secondary',
  warnings: 'warn',
};

const TASK_SEVERITY: Record<TaskStatus, Severity> = {
  pending: 'secondary',
  processing: 'info',
  completed: 'success',
  failed: 'danger',
};

/** Biggest file we read in the browser (the whole file is sent as base64 JSON). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Import and export for every resource the backend supports, on one page.
 * 🧠 Import is two steps: "Check file" runs a dry run and shows every row's result; "Import" saves, and is only
 * offered when the check found no errors (the backend rejects the whole file otherwise). Imports run synchronously:
 * async ones need a Celery worker and would only show up in the history.
 */
@Component({
  selector: 'app-import-export-page',
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    SelectModule,
    SelectButtonModule,
    TableModule,
    PageHeaderComponent,
    EmptyStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-export-page.component.html',
})
export class ImportExportPageComponent implements OnInit {
  private readonly api = inject(ImportExportService);
  private readonly access = inject(AccessService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

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

  format: ExportFormat = 'csv';
  readonly formatOptions = [
    { label: 'CSV', value: 'csv' },
    { label: 'Excel', value: 'xlsx' },
  ];
  readonly exporting = signal(false);
  readonly downloadingTemplate = signal(false);

  readonly file = signal<File | null>(null);
  readonly fileError = signal<string | null>(null);
  readonly checking = signal(false);
  readonly importing = signal(false);
  /** The dry run of the current file. */
  readonly check = signal<ImportResult | null>(null);
  readonly lastImport = signal<ImportResult | null>(null);
  readonly canImport = computed(() => {
    const check = this.check();
    return !!check && check.stats.errors === 0 && check.stats.new + check.stats.updated > 0;
  });

  taskType: 'import' | 'export' | null = null;
  readonly tasks = new ServerTable<DataTask>((query) => this.api.tasks(query.page, query.pageSize, this.taskType));
  readonly typeOptions = (['import', 'export'] as const).map((type) => ({ value: type, label: `importExport.taskTypes.${type}` }));
  readonly errorTitleKey = errorTitleKey;
  readonly modelName = taskModelName;

  ngOnInit(): void {
    this.tasks.load();
  }

  onResourceChange(key: string | null): void {
    this.selectedKey.set(key);
    this.clearFile();
  }

  exportData(): void {
    const resource = this.selected();
    if (!resource) {
      return;
    }
    this.exporting.set(true);
    this.api.exportFile(resource.path, this.format).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        saveFile(blob, `${resource.key}_${new Date().toISOString().slice(0, 10)}.${this.format}`);
      },
      error: (error: AppError) => this.failed(error, () => this.exporting.set(false)),
    });
  }

  downloadTemplate(): void {
    const resource = this.selected();
    if (!resource) {
      return;
    }
    this.downloadingTemplate.set(true);
    this.api.template(resource.path).subscribe({
      next: (blob) => {
        this.downloadingTemplate.set(false);
        saveFile(blob, `${resource.key}_template.xlsx`);
      },
      error: (error: AppError) => this.failed(error, () => this.downloadingTemplate.set(false)),
    });
  }

  onFilePicked(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.check.set(null);
    this.lastImport.set(null);
    if (file && !/\.(csv|xlsx)$/i.test(file.name)) {
      this.fileError.set('importExport.hints.fileType');
      this.file.set(null);
      return;
    }
    if (file && file.size > MAX_FILE_BYTES) {
      this.fileError.set('importExport.hints.fileSize');
      this.file.set(null);
      return;
    }
    this.fileError.set(null);
    this.file.set(file);
  }

  clearFile(): void {
    this.file.set(null);
    this.fileError.set(null);
    this.check.set(null);
    this.lastImport.set(null);
  }

  /** Resolves once the file is read and the request is sent. */
  checkFile(): Promise<void> {
    return this.run(true);
  }

  importFile(): Promise<void> {
    return this.run(false);
  }

  rowSeverity(status: ImportRowStatus): Severity {
    return ROW_SEVERITY[status] ?? 'secondary';
  }

  taskSeverity(status: TaskStatus): Severity {
    return TASK_SEVERITY[status] ?? 'secondary';
  }

  /** "name: Cables · parent: —" for the preview table. */
  rowSummary(data: Record<string, unknown>): string {
    return Object.entries(data)
      .slice(0, 4)
      .map(([key, value]) => `${key}: ${value === '' || value === null || value === undefined ? '—' : String(value)}`)
      .join(' · ');
  }

  onTaskTypeChange(): void {
    this.tasks.first.set(0);
    this.tasks.load();
  }

  downloadTask(task: DataTask): void {
    if (!task.download_url) {
      return;
    }
    this.api.download(task.download_url).subscribe({
      next: (blob) => saveFile(blob, task.filename ?? 'export'),
      error: (error: AppError) => this.failed(error, () => undefined),
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

  private async run(dryRun: boolean): Promise<void> {
    const resource = this.selected();
    const file = this.file();
    if (!resource || !file) {
      return;
    }
    const busy = dryRun ? this.checking : this.importing;
    busy.set(true);
    let content: string;
    try {
      content = await fileToDataUri(file);
    } catch {
      busy.set(false);
      this.fileError.set('importExport.hints.unreadable');
      return;
    }
    this.api.importFile(resource.path, content, dryRun).subscribe({
      next: (result) => {
        busy.set(false);
        if (dryRun) {
          this.check.set(result);
        } else {
          this.lastImport.set(result);
          this.check.set(null);
          this.file.set(null);
          this.notifications.success(this.translate.instant('importExport.toasts.imported', { count: result.stats.new + result.stats.updated }));
        }
        this.tasks.load();
      },
      error: (error: AppError) => this.failed(error, () => busy.set(false)),
    });
  }

  /** Network and 5xx errors were already shown by the interceptor; show the backend's message for the rest. */
  private failed(error: AppError, done: () => void): void {
    done();
    if (error.status >= 400 && error.status < 500) {
      this.notifications.error(error.message);
    }
  }
}
