import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { DeliveryNote, DeliveryNoteDetailsPayload, DeliveryNoteListItem } from '../sales.models';

/**
 * Delivery notes. They're created from an order (SalesOrderService.createDelivery), which already issues the stock;
 * afterwards only the details and the workflow change: draft → confirmed → in transit → delivered (or failed).
 */
@Injectable({ providedIn: 'root' })
export class DeliveryNoteService extends CrudApi<DeliveryNoteListItem, DeliveryNoteDetailsPayload> {
  protected readonly path = 'sales/delivery-notes/';

  detail(id: number): Observable<DeliveryNote> {
    return this.get<DeliveryNote>(this.detailPath(id)).pipe(map((response) => response.data as DeliveryNote));
  }

  /** draft → confirmed; the order becomes "shipped" once every line is fully shipped. */
  confirmDelivery(id: number): Observable<DeliveryNote> {
    return this.action(id, 'confirm_delivery');
  }

  /** confirmed → in transit. */
  ship(id: number, carrier: string, trackingNumber: string): Observable<DeliveryNote> {
    return this.action(id, 'ship', { carrier, tracking_number: trackingNumber });
  }

  /** in transit → delivered (pick-ups straight from confirmed). The order is delivered when all its notes are. */
  markDelivered(id: number): Observable<DeliveryNote> {
    return this.action(id, 'mark_delivered');
  }

  /** in transit → failed; the goods stay issued (handle them with a return). */
  markFailed(id: number, reason: string): Observable<DeliveryNote> {
    return this.action(id, 'mark_failed', { reason });
  }

  private action(id: number, name: string, body: unknown = {}): Observable<DeliveryNote> {
    return this.post<DeliveryNote>(`${this.detailPath(id)}${name}/`, body).pipe(map((response) => response.data as DeliveryNote));
  }
}
