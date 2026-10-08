import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Warehouse, WarehousePayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class WarehouseService extends CrudApi<Warehouse, WarehousePayload> {
  protected readonly path = 'inventory/v1/warehouse/';
}
