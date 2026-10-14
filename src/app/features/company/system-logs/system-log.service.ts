import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { AuditLogEntry } from './system-log.models';

/** The system log, read-only (the backend writes it). */
@Injectable({ providedIn: 'root' })
export class SystemLogService extends CrudApi<AuditLogEntry, never> {
  protected readonly path = 'audit/v1/logs/';

  /** The log as Excel, with the same search and filters as the list. */
  exportXlsx(query: { search?: string; filters: Record<string, string | number> }): Observable<Blob> {
    const params: Record<string, string | number> = { ...query.filters };
    if (query.search) {
      params['search'] = query.search;
    }
    return this.getBlob(`${this.path}export/`, { params });
  }
}
