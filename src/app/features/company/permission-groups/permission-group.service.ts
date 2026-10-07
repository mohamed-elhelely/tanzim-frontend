import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { PermissionGroup, PermissionGroupPayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class PermissionGroupService extends CrudApi<PermissionGroup, PermissionGroupPayload> {
  protected readonly path = 'company/v1/permission-groups/';
}
