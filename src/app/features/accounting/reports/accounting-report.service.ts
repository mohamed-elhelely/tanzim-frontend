import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../../core/api/base-api.service';
import { ReportResult, ReportType } from '../accounting.models';

/** Runs an accounting report, or downloads it as Excel (`export=xlsx`). */
@Injectable({ providedIn: 'root' })
export class AccountingReportService extends BaseApiService {
  run(type: ReportType, params: Record<string, string>): Observable<ReportResult> {
    return this.get<ReportResult>(`accounting/v1/reports/${type}/`, { params }).pipe(map((response) => response.data as ReportResult));
  }

  exportXlsx(type: ReportType, params: Record<string, string>): Observable<Blob> {
    return this.getBlob(`accounting/v1/reports/${type}/`, { params: { ...params, export: 'xlsx' } });
  }
}
