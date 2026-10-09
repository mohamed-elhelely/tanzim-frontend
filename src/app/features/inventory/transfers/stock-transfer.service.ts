import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { MovementQuantity, StockTransfer, StockTransferPayload } from '../inventory.models';

/**
 * Stock transfers between warehouses and their workflow (POST …/{id}/action/ with `action`):
 * draft → submit → pending_approval → approve → ship (stock leaves the source) → receive (stock enters the
 * destination; partial receipts allowed). Reject sends a pending transfer back to draft; cancel before shipping.
 */
@Injectable({ providedIn: 'root' })
export class StockTransferService extends CrudApi<StockTransfer, StockTransferPayload> {
  protected readonly path = 'inventory/v1/stock-transfer/';

  submit(id: number): Observable<StockTransfer> {
    return this.action(id, 'submit');
  }

  approve(id: number): Observable<StockTransfer> {
    return this.action(id, 'approve');
  }

  reject(id: number, reason: string): Observable<StockTransfer> {
    return this.action(id, 'reject', { reason });
  }

  ship(id: number, lines: MovementQuantity[], carrier: string, trackingNumber: string): Observable<StockTransfer> {
    return this.action(id, 'ship', { lines, carrier, tracking_number: trackingNumber });
  }

  receive(id: number, lines: MovementQuantity[]): Observable<StockTransfer> {
    return this.action(id, 'receive', { lines });
  }

  cancel(id: number): Observable<StockTransfer> {
    return this.action(id, 'cancel');
  }

  private action(id: number, action: string, body: object = {}): Observable<StockTransfer> {
    return this.post<StockTransfer>(`${this.detailPath(id)}action/`, { action, ...body }).pipe(
      map((response) => response.data as StockTransfer),
    );
  }
}
