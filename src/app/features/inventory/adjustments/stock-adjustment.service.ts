import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { StockAdjustment, StockAdjustmentPayload } from '../inventory.models';

/**
 * Stock adjustments and their workflow (POST …/{id}/action/ with `action`): draft → submit → pending → approve →
 * post (writes the stock ledger). Reject sends a pending adjustment back to draft.
 */
@Injectable({ providedIn: 'root' })
export class StockAdjustmentService extends CrudApi<StockAdjustment, StockAdjustmentPayload> {
  protected readonly path = 'inventory/v1/stock-adjustment/';

  submit(id: number): Observable<StockAdjustment> {
    return this.action(id, 'submit');
  }

  approve(id: number): Observable<StockAdjustment> {
    return this.action(id, 'approve');
  }

  reject(id: number, reason: string): Observable<StockAdjustment> {
    return this.action(id, 'reject', { reason });
  }

  postToStock(id: number): Observable<StockAdjustment> {
    return this.action(id, 'post');
  }

  private action(id: number, action: string, body: object = {}): Observable<StockAdjustment> {
    return this.post<StockAdjustment>(`${this.detailPath(id)}action/`, { action, ...body }).pipe(
      map((response) => response.data as StockAdjustment),
    );
  }
}
