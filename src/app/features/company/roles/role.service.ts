import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Role, RolePayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class RoleService extends CrudApi<Role, RolePayload> {
  protected readonly path = 'company/v1/roles/';
}
