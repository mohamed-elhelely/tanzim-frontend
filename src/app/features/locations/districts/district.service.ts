import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { District, DistrictPayload } from '../locations.models';

@Injectable({ providedIn: 'root' })
export class DistrictService extends CrudApi<District, DistrictPayload> {
  protected readonly path = 'company/v1/district/';
}
