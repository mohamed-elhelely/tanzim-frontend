import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../core/api/base-api.service';
import { Dashboard, DashboardName, DashboardRef, ReportResult, ReportType } from './analytics.models';

/** Reports and role dashboards (/api/reports/v1/): read-only, computed on request. */
@Injectable({ providedIn: 'root' })
export class AnalyticsService extends BaseApiService {
  dashboards(): Observable<DashboardRef[]> {
    return this.get<DashboardRef[]>('reports/v1/dashboards/').pipe(map((response) => response.data ?? []));
  }

  dashboard(name: DashboardName, params: Record<string, string>): Observable<Dashboard> {
    return this.get<Dashboard>(`reports/v1/dashboards/${name}/`, { params }).pipe(map((response) => response.data as Dashboard));
  }

  reportTypes(): Observable<ReportType[]> {
    return this.get<ReportType[]>('reports/v1/types/').pipe(map((response) => response.data ?? []));
  }

  run(type: string, params: Record<string, string>): Observable<ReportResult> {
    return this.get<ReportResult>(`reports/v1/run/${type}/`, { params }).pipe(map((response) => response.data as ReportResult));
  }

  exportXlsx(type: string, params: Record<string, string>): Observable<Blob> {
    return this.getBlob(`reports/v1/run/${type}/`, { params: { ...params, export: 'xlsx' } });
  }
}
