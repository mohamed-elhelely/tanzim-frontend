import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { SupplierReturn, SupplierReturnListItem, SupplierReturnPayload } from '../returns.models';

/** Returns to a supplier: draft → approved (stock leaves) → shipped → confirmed by the supplier → closed. */
@Injectable({ providedIn: 'root' })
export class SupplierReturnService extends CrudApi<SupplierReturnListItem, SupplierReturnPayload, { id: number }> {
  protected readonly path = 'returns/v1/supplier-returns/';

  detail(id: number): Observable<SupplierReturn> {
    return this.get<SupplierReturn>(this.detailPath(id)).pipe(map((response) => response.data as SupplierReturn));
  }

  approve(id: number): Observable<SupplierReturn> {
    return this.action(id, 'approve');
  }

  ship(id: number): Observable<SupplierReturn> {
    return this.action(id, 'ship');
  }

  confirmReceipt(id: number): Observable<SupplierReturn> {
    return this.action(id, 'confirm_receipt');
  }

  /** Records the refund actually received; without an amount the backend keeps the lines' value. */
  close(id: number, refundAmount: string | null): Observable<SupplierReturn> {
    return this.action(id, 'close', refundAmount ? { refund_amount: refundAmount } : {});
  }

  private action(id: number, name: string, body: unknown = {}): Observable<SupplierReturn> {
    return this.post<SupplierReturn>(`${this.detailPath(id)}${name}/`, body).pipe(map((response) => response.data as SupplierReturn));
  }
}
