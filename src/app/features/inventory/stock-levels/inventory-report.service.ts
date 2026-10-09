import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../../core/api/base-api.service';
import { StockValuation } from '../inventory.models';

/** The inventory valuation report (`/api/reports/v1/run/inventory_valuation/`): on-hand stock per variant, or Excel. */
@Injectable({ providedIn: 'root' })
export class InventoryReportService extends BaseApiService {
  valuation(params: Record<string, string>): Observable<StockValuation> {
    return this.get<StockValuation>('reports/v1/run/inventory_valuation/', { params }).pipe(
      map((response) => response.data as StockValuation),
    );
  }

  valuationXlsx(params: Record<string, string>): Observable<Blob> {
    return this.getBlob('reports/v1/run/inventory_valuation/', { params: { ...params, export: 'xlsx' } });
  }
}
