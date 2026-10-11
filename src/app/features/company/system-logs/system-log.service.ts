import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { AuditLogEntry } from './system-log.models';

/** The system log, read-only (the backend writes it). */
@Injectable({ providedIn: 'root' })
export class SystemLogService extends CrudApi<AuditLogEntry, never> {
  protected readonly path = 'audit/v1/logs/';
}
