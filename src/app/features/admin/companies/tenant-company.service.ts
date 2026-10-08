import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { TenantCompany, TenantCompanyPayload } from '../admin.models';

/** Platform staff only. The list is not paginated: use `all()`. */
@Injectable({ providedIn: 'root' })
export class TenantCompanyService extends CrudApi<TenantCompany, TenantCompanyPayload> {
  protected readonly path = 'company/v1/admin/company/';
}
