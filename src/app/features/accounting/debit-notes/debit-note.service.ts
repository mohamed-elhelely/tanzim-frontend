import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { DebitNote, DebitNotePayload } from '../accounting.models';

/** Claims against suppliers. Drafts are edited or deleted; issuing posts them; issued notes are cancelled. */
@Injectable({ providedIn: 'root' })
export class DebitNoteService extends CrudApi<DebitNote, DebitNotePayload> {
  protected readonly path = 'accounting/v1/debit-notes/';

  issue(id: number): Observable<DebitNote> {
    return this.action(`${this.detailPath(id)}issue/`, {});
  }

  cancel(id: number, reason: string): Observable<DebitNote> {
    return this.action(`${this.detailPath(id)}cancel/`, { reason });
  }

  /** A draft note for an approved supplier return (its value, plus optional tax). */
  fromSupplierReturn(supplierReturnId: number): Observable<DebitNote> {
    return this.action(`${this.path}from-supplier-return/`, { supplier_return: supplierReturnId });
  }

  private action(path: string, body: unknown): Observable<DebitNote> {
    return this.post<DebitNote>(path, body).pipe(map((response) => response.data as DebitNote));
  }
}
