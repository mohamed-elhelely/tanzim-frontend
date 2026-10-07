import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Permission, PermissionPayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class PermissionService extends CrudApi<Permission, PermissionPayload> {
  protected readonly path = 'company/v1/permissions/';
}
