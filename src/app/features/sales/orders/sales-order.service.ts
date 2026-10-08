import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { SalesOrder, SalesOrderListItem, SalesOrderPayload, SalesOrderSaved } from '../sales.models';

/**
 * Sales orders and their workflow actions. The list returns SalesOrderListItem; `detail()` returns the full
 * order with lines. Create/update return a short shape (SalesOrderSaved), so screens re-fetch afterwards.
 */
@Injectable({ providedIn: 'root' })
export class SalesOrderService extends CrudApi<SalesOrderListItem, SalesOrderPayload, SalesOrderSaved> {
  protected readonly path = 'sales/sales-orders/';

  detail(id: number): Observable<SalesOrder> {
    return this.get<SalesOrder>(this.detailPath(id)).pipe(map((response) => response.data as SalesOrder));
  }

  /** draft → confirmed: checks the customer's credit and reserves stock for every line. */
  confirm(id: number): Observable<SalesOrder> {
    return this.action(id, 'confirm');
  }

  /** From draft, confirmed or on hold; releases the reservations. */
  cancel(id: number, reason: string): Observable<SalesOrder> {
    return this.action(id, 'cancel', { reason });
  }

  /** A new draft copy (same customer, warehouse and lines). */
  clone(id: number): Observable<SalesOrder> {
    return this.action(id, 'clone');
  }

  /** shipped → delivered. */
  markDelivered(id: number): Observable<SalesOrder> {
    return this.action(id, 'mark_delivered');
  }

  private action(id: number, name: string, body: unknown = {}): Observable<SalesOrder> {
    return this.post<SalesOrder>(`${this.detailPath(id)}${name}/`, body).pipe(map((response) => response.data as SalesOrder));
  }
}
