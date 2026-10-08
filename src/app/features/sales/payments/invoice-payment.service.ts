import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { InvoicePayment, PaymentPayload } from '../sales.models';

/** Payments are append-only: recorded through the invoice (SalesInvoiceService.pay) and refunded in full, once. */
@Injectable({ providedIn: 'root' })
export class InvoicePaymentService extends CrudApi<InvoicePayment, PaymentPayload> {
  protected readonly path = 'sales/invoice-payments/';

  refund(id: number): Observable<InvoicePayment> {
    return this.post<InvoicePayment>(`${this.detailPath(id)}refund/`, {}).pipe(map((response) => response.data as InvoicePayment));
  }
}
