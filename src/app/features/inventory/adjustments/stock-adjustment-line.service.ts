import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { StockAdjustmentLine, StockAdjustmentLinePayload } from '../inventory.models';

/** An adjustment's lines; `forAdjustment` reads up to 100 (one page). */
@Injectable({ providedIn: 'root' })
export class StockAdjustmentLineService extends CrudApi<StockAdjustmentLine, StockAdjustmentLinePayload> {
  protected readonly path = 'inventory/v1/stock-adjustment-line/';

  forAdjustment(adjustment: number): Observable<StockAdjustmentLine[]> {
    return this.list({ page: 1, pageSize: 100, ordering: 'id', filters: { adjustment } }).pipe(map((page) => page.items));
  }
}
