import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { CustomerReturn, CustomerReturnListItem, CustomerReturnPayload, InspectLine, ReceiveLine } from '../returns.models';

/**
 * Customer returns (RMA) and their workflow. Receiving puts the goods back into stock; inspecting decides what
 * happens to them (restock, quarantine, write off, back to the supplier, warranty repair).
 */
@Injectable({ providedIn: 'root' })
export class CustomerReturnService extends CrudApi<CustomerReturnListItem, CustomerReturnPayload, { id: number }> {
  protected readonly path = 'returns/v1/customer-returns/';

  detail(id: number): Observable<CustomerReturn> {
    return this.get<CustomerReturn>(this.detailPath(id)).pipe(map((response) => response.data as CustomerReturn));
  }

  approve(id: number): Observable<CustomerReturn> {
    return this.action(id, 'approve');
  }

  /** Turns the request down before anything is received (requested or approved). */
  reject(id: number, reason: string): Observable<CustomerReturn> {
    return this.action(id, 'reject', { reason });
  }

  receive(id: number, lines: ReceiveLine[]): Observable<CustomerReturn> {
    return this.action(id, 'receive', { lines });
  }

  inspect(id: number, lines: InspectLine[]): Observable<CustomerReturn> {
    return this.action(id, 'inspect', { lines });
  }

  /** Without an amount the backend refunds the accepted value. */
  close(id: number, refundAmount: string | null): Observable<CustomerReturn> {
    return this.action(id, 'close', refundAmount ? { refund_amount: refundAmount } : {});
  }

  /** A new sales order for the accepted items (inspected or closed returns). */
  createReplacement(id: number): Observable<{ replacement_order: number; order_number: string }> {
    return this.post<{ replacement_order: number; order_number: string }>(`${this.detailPath(id)}create_replacement/`, {}).pipe(
      map((response) => response.data as { replacement_order: number; order_number: string }),
    );
  }

  private action(id: number, name: string, body: unknown = {}): Observable<CustomerReturn> {
    return this.post<CustomerReturn>(`${this.detailPath(id)}${name}/`, body).pipe(map((response) => response.data as CustomerReturn));
  }
}
