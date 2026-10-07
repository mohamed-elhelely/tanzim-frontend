import { Injectable } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { CrudApi } from '../../../core/api/crud-api';
import { AppError } from '../../../core/errors/app-error';
import { CompanyUser, CompanyUserPayload, SelectOption } from '../company.models';

@Injectable({ providedIn: 'root' })
export class CompanyUserService extends CrudApi<CompanyUser, CompanyUserPayload> {
  protected readonly path = 'company/v1/company-user/';

  /** The create response is a shorter shape (API_REFERENCE: "Re-fetch the detail"), so load the full record. */
  override create(body: CompanyUserPayload): Observable<CompanyUser> {
    return super.create(body).pipe(
      switchMap((created) => {
        const id = (created as Partial<CompanyUser> | null)?.id;
        if (typeof id === 'number') {
          return this.retrieve(id);
        }
        return this.all().pipe(map((users) => this.findByEmail(users, body.user.email)));
      }),
    );
  }

  /** Options for "user" pickers. Department manager and team leads take the login user id. */
  userOptions(): Observable<SelectOption[]> {
    return this.all().pipe(
      map((users) =>
        users.map((u) => ({ value: u.user.id, label: `${u.user.first_name} ${u.user.last_name} (${u.user.email})` })),
      ),
    );
  }

  private findByEmail(users: CompanyUser[], email: string): CompanyUser {
    const match = users.find((u) => u.user.email.toLowerCase() === email.toLowerCase());
    if (!match) {
      const error: AppError = { status: 404, message: 'The new user could not be loaded.', errors: {} };
      throw error;
    }
    return match;
  }
}
