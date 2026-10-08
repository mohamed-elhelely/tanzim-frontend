import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { SupplierPayment, SupplierPaymentPayload } from '../accounting.models';

/** Money paid to suppliers, optionally allocated to their invoices. Recorded once; voided if wrong. */
@Injectable({ providedIn: 'root' })
export class SupplierPaymentService extends CrudApi<SupplierPayment, SupplierPaymentPayload> {
  protected readonly path = 'accounting/v1/supplier-payments/';

  void(id: number, reason: string): Observable<SupplierPayment> {
    return this.post<SupplierPayment>(`${this.detailPath(id)}void/`, { reason }).pipe(map((response) => response.data as SupplierPayment));
  }
}
