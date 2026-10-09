import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { StockTransferLine, StockTransferLinePayload } from '../inventory.models';

/** A transfer's lines; `forTransfer` reads up to 100 (one page). */
@Injectable({ providedIn: 'root' })
export class StockTransferLineService extends CrudApi<StockTransferLine, StockTransferLinePayload> {
  protected readonly path = 'inventory/v1/stock-transfer-line/';

  forTransfer(transfer: number): Observable<StockTransferLine[]> {
    return this.list({ page: 1, pageSize: 100, ordering: 'id', filters: { transfer } }).pipe(map((page) => page.items));
  }
}
