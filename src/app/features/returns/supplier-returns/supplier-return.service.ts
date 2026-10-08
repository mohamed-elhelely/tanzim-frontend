import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { SupplierReturn, SupplierReturnListItem, SupplierReturnPayload } from '../returns.models';

/** Returns to a supplier: draft → approved (stock leaves) → shipped → confirmed by the supplier. */
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

  private action(id: number, name: string): Observable<SupplierReturn> {
    return this.post<SupplierReturn>(`${this.detailPath(id)}${name}/`, {}).pipe(map((response) => response.data as SupplierReturn));
  }
}
