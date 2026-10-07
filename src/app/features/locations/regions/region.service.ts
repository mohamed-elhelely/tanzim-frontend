import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Region, RegionPayload } from '../locations.models';

@Injectable({ providedIn: 'root' })
export class RegionService extends CrudApi<Region, RegionPayload> {
  protected readonly path = 'company/v1/region/';
}
