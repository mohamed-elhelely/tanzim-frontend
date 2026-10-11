import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { DialogModule } from 'primeng/dialog';
import { MenuModule } from 'primeng/menu';
import { TableModule } from 'primeng/table';
import { AccessService } from '../../core/auth/access.service';
import { AppError } from '../../core/errors/app-error';
import { NotificationService } from '../../core/services/notification.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { saveFile } from '../../shared/utils/save-file';
import { ExportFormat, ImportFailure, ImportRowStatus, dataResource, importFailure } from './import-export.models';
import { ImportExportService, fileToDataUri } from './import-export.service';

type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

const ROW_SEVERITY: Record<ImportRowStatus, Severity> = {
  new: 'success',
  updated: 'info',
  errors: 'danger',
  skipped: 'secondary',
  warnings: 'warn',
};

/** Biggest file we read in the browser (the whole file is sent as base64 JSON). */
const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * Export, template and import buttons for one resource, placed in a list page's header next to its Create button.
 * 🧠 Import saves straight away (no separate check): the backend rolls the whole file back when any row fails and
 * answers 400 with every row's result, which the dialog lists so the user can fix the file and try again.
 */
@Component({
  selector: 'app-import-export-actions',
  imports: [FormsModule, TranslatePipe, ButtonModule, DialogModule, MenuModule, TableModule, ToggleSwitchModule, EmptyStateComponent, StatusBadgeComponent],
  // The buttons sit directly in the page header's action row.
  host: { class: 'contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './import-export-actions.component.html',
})
export class ImportExportActionsComponent {
  private readonly api = inject(ImportExportService);
  private readonly access = inject(AccessService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  private readonly key = signal('');
  /** Key from DATA_RESOURCES, e.g. 'category'. */
  @Input({ required: true }) set resource(key: string) {
    this.key.set(key);
  }
  /** Emitted after a successful import so the page can reload its table. */
  @Output() imported = new EventEmitter<void>();

  readonly config = computed(() => dataResource(this.key()));
  /** Same rule as the Import / Export page: subscription module and, for company data, permission. */
  readonly allowed = computed(() => {
    const resource = this.config();
    return (!resource.module || this.access.hasModule(resource.module)) && (!resource.permission || this.access.can(resource.permission));
  });

  readonly exporting = signal(false);
  readonly downloadingTemplate = signal(false);
  readonly importing = signal(false);
  readonly failure = signal<ImportFailure | null>(null);
  /** The name of the file the failure belongs to, shown in the dialog. */
  readonly failedFile = signal('');
  onlyProblems = true;

  readonly exportItems: MenuItem[] = (['csv', 'xlsx'] as const).map((format) => ({
    label: format === 'csv' ? 'CSV' : 'Excel',
    icon: format === 'csv' ? 'pi pi-file' : 'pi pi-file-excel',
    command: () => this.exportData(format),
  }));

  exportData(format: ExportFormat): void {
    const resource = this.config();
    this.exporting.set(true);
    this.api.exportFile(resource.path, format).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        saveFile(blob, `${resource.key}_${new Date().toISOString().slice(0, 10)}.${format}`);
      },
      error: (error: AppError) => this.failed(error, () => this.exporting.set(false)),
    });
  }

  downloadTemplate(): void {
    const resource = this.config();
    this.downloadingTemplate.set(true);
    this.api.template(resource.path).subscribe({
      next: (blob) => {
        this.downloadingTemplate.set(false);
        saveFile(blob, `${resource.key}_template.xlsx`);
      },
      error: (error: AppError) => this.failed(error, () => this.downloadingTemplate.set(false)),
    });
  }

  /** Imports the picked file right away; resolves once the file is read and the request is sent. */
  async onFilePicked(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) {
      return;
    }
    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      this.notifications.error(this.translate.instant('importExport.hints.fileType'));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      this.notifications.error(this.translate.instant('importExport.hints.fileSize'));
      return;
    }
    this.importing.set(true);
    let content: string;
    try {
      content = await fileToDataUri(file);
    } catch {
      this.importing.set(false);
      this.notifications.error(this.translate.instant('importExport.hints.unreadable'));
      return;
    }
    this.api.importFile(this.config().path, content, false).subscribe({
      next: (result) => {
        this.importing.set(false);
        this.notifications.success(
          this.translate.instant('importExport.hints.imported', { new: result.stats.new, updated: result.stats.updated }),
        );
        this.imported.emit();
      },
      error: (error: AppError) => {
        this.importing.set(false);
        if (error.status >= 400 && error.status < 500) {
          this.failedFile.set(file.name);
          this.onlyProblems = true;
          this.failure.set(importFailure(error));
        }
      },
    });
  }

  closeFailure(): void {
    this.failure.set(null);
  }

  /** Rows with an error or warning, or every row when the filter is off. */
  visibleRows(failure: ImportFailure) {
    return this.onlyProblems ? failure.rows.filter((row) => row.error || row.warning) : failure.rows;
  }

  rowSeverity(status: ImportRowStatus): Severity {
    return ROW_SEVERITY[status] ?? 'secondary';
  }

  /** "name: Cables · parent: —" for the result table. */
  rowSummary(data: Record<string, unknown>): string {
    return Object.entries(data ?? {})
      .slice(0, 4)
      .map(([key, value]) => `${key}: ${value === '' || value === null || value === undefined ? '—' : String(value)}`)
      .join(' · ');
  }

  /** Network and 5xx errors were already shown by the interceptor; show the backend's message for the rest. */
  private failed(error: AppError, done: () => void): void {
    done();
    if (error.status >= 400 && error.status < 500) {
      this.notifications.error(error.message);
    }
  }
}
