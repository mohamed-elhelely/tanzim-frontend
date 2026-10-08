import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Zone, ZonePayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class ZoneService extends CrudApi<Zone, ZonePayload> {
  protected readonly path = 'inventory/v1/zone/';
}
