import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Department, DepartmentPayload } from '../company.models';

@Injectable({ providedIn: 'root' })
export class DepartmentService extends CrudApi<Department, DepartmentPayload> {
  protected readonly path = 'company/v1/departments/';
}
