import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { SupplierProduct, SupplierProductPayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class SupplierProductService extends CrudApi<SupplierProduct, SupplierProductPayload> {
  protected readonly path = 'inventory/v1/supplier-product/';
}
