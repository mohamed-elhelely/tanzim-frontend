import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { CompanyUser, CompanyUserCreated, CompanyUserPayload, SelectOption } from '../company.models';

/** create() returns the short CompanyUserCreated shape; load a full record with retrieve() or all(). */
@Injectable({ providedIn: 'root' })
export class CompanyUserService extends CrudApi<CompanyUser, CompanyUserPayload, CompanyUserCreated> {
  protected readonly path = 'company/v1/company-user/';

  /** Options for "user" pickers. Department manager and team leads take the login user id. */
  /** For pickers (department manager, team leads). Uses `?dropdown=true`, which needs no view_companyuser permission. */
  userOptions(): Observable<SelectOption[]> {
    return this.dropdown<CompanyUser>().pipe(
      map((users) =>
        users.map((u) => ({ value: u.user.id, label: `${u.user.first_name} ${u.user.last_name} (${u.user.email})` })),
      ),
    );
  }
}
