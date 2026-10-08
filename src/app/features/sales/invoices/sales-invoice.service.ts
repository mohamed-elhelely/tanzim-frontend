import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { PaymentPayload, SalesInvoice, SalesInvoiceDetailsPayload, SalesInvoiceListItem } from '../sales.models';

/**
 * Sales invoices: created as a draft from a delivered order, then issued, paid (in one or more payments)
 * or cancelled. Only drafts can be edited or deleted.
 */
@Injectable({ providedIn: 'root' })
export class SalesInvoiceService extends CrudApi<SalesInvoiceListItem, SalesInvoiceDetailsPayload> {
  protected readonly path = 'sales/sales-invoices/';

  detail(id: number): Observable<SalesInvoice> {
    return this.get<SalesInvoice>(this.detailPath(id)).pipe(map((response) => response.data as SalesInvoice));
  }

  /** A draft invoice for every shipped line of a delivered order. */
  createFromOrder(orderId: number): Observable<SalesInvoice> {
    return this.post<SalesInvoice>(`${this.path}create_from_order/`, { sales_order: orderId }).pipe(
      map((response) => response.data as SalesInvoice),
    );
  }

  /** draft → issued; the amount becomes an open balance on the customer. */
  issue(id: number): Observable<SalesInvoice> {
    return this.action(id, 'issue');
  }

  /** Records a payment (at most the amount due); returns the updated invoice. */
  pay(id: number, body: PaymentPayload): Observable<SalesInvoice> {
    return this.action(id, 'pay', body);
  }

  /** Not allowed once a payment is applied (refund it first). */
  cancel(id: number, reason: string): Observable<SalesInvoice> {
    return this.action(id, 'cancel', { reason });
  }

  private action(id: number, name: string, body: unknown = {}): Observable<SalesInvoice> {
    return this.post<SalesInvoice>(`${this.detailPath(id)}${name}/`, body).pipe(map((response) => response.data as SalesInvoice));
  }
}
