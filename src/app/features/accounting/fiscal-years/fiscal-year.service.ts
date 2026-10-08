import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { FiscalPeriod, FiscalYear, FiscalYearPayload } from '../accounting.models';

/** Fiscal years with their monthly periods. Nothing can be posted into a closed period. */
@Injectable({ providedIn: 'root' })
export class FiscalYearService extends CrudApi<FiscalYear, FiscalYearPayload> {
  protected readonly path = 'accounting/v1/fiscal-years/';

  /** Closes every period and moves the year's result to retained earnings (a closing entry). */
  close(id: number): Observable<FiscalYear> {
    return this.action(`${this.detailPath(id)}close/`);
  }

  reopen(id: number): Observable<FiscalYear> {
    return this.action(`${this.detailPath(id)}reopen/`);
  }

  closePeriod(periodId: number): Observable<FiscalPeriod> {
    return this.post<FiscalPeriod>(`accounting/v1/fiscal-periods/${periodId}/close/`, {}).pipe(map((response) => response.data as FiscalPeriod));
  }

  reopenPeriod(periodId: number): Observable<FiscalPeriod> {
    return this.post<FiscalPeriod>(`accounting/v1/fiscal-periods/${periodId}/reopen/`, {}).pipe(
      map((response) => response.data as FiscalPeriod),
    );
  }

  private action(path: string): Observable<FiscalYear> {
    return this.post<FiscalYear>(path, {}).pipe(map((response) => response.data as FiscalYear));
  }
}
