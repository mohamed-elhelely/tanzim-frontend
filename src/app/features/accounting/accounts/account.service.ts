import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { Account, AccountPayload } from '../accounting.models';

/**
 * Chart of accounts. The backend creates the default chart on the first list; `all()` (no `page`) returns every
 * account, ordered by code.
 */
@Injectable({ providedIn: 'root' })
export class AccountService extends CrudApi<Account, AccountPayload> {
  protected readonly path = 'accounting/v1/accounts/';

  /** Adds any default account the company is missing. */
  setup(): Observable<Account[]> {
    return this.post<{ created: Account[] }>(`${this.path}setup/`, {}).pipe(map((response) => response.data?.created ?? []));
  }
}
