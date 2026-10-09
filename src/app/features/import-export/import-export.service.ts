import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../core/api/base-api.service';
import { Paginated } from '../../core/models/api-response.model';
import { DataTask, ExportFormat, ImportResult } from './import-export.models';

/** The data URI prefixes the backend recognises. ⚠️ Excel needs the non-standard "@file/…" form (API_REFERENCE.md). */
const MIME_PREFIX = {
  csv: 'data:text/csv;base64,',
  xlsx: 'data:@file/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,',
};

/** Reads a picked file as the base64 data URI the import endpoint expects, ignoring the browser's own MIME type. */
export function fileToDataUri(file: File): Promise<string> {
  const kind = /\.xlsx$/i.test(file.name) ? 'xlsx' : 'csv';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? '');
      resolve(MIME_PREFIX[kind] + result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Import, export, templates and the background task list (common/base_import_export.py). */
@Injectable({ providedIn: 'root' })
export class ImportExportService extends BaseApiService {
  exportFile(path: string, format: ExportFormat): Observable<Blob> {
    return this.getBlob(`${path}export/`, { params: { format } });
  }

  /** An Excel file with the headers the import expects. */
  template(path: string): Observable<Blob> {
    return this.postBlob(`${path}import/?template=true`);
  }

  /** `dryRun` validates and previews every row without saving anything. */
  importFile(path: string, file: string, dryRun: boolean): Observable<ImportResult> {
    return this.post<ImportResult>(`${path}import/`, { file, dry_run: dryRun }).pipe(map((response) => response.data as ImportResult));
  }

  tasks(page: number, pageSize: number, type: 'import' | 'export' | null): Observable<Paginated<DataTask>> {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (type) {
      params['type'] = type;
    }
    return this.get<DataTask[]>('common/v1/tasks/', { params }).pipe(
      map((response) => {
        const items = response.data ?? [];
        return { items, total: response.metadata?.total_count ?? items.length, page, pageSize };
      }),
    );
  }

  /** The file of a finished background export (`download_url` is a path under the API). */
  download(downloadUrl: string): Observable<Blob> {
    return this.getBlob(downloadUrl.replace(/^\/?api\//, ''));
  }
}
