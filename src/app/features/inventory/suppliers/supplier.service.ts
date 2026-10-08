import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Supplier, SupplierPayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class SupplierService extends CrudApi<Supplier, SupplierPayload> {
  protected readonly path = 'inventory/v1/supplier/';
}
