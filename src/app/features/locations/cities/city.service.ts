import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { City, CityPayload } from '../locations.models';

@Injectable({ providedIn: 'root' })
export class CityService extends CrudApi<City, CityPayload> {
  protected readonly path = 'company/v1/city/';
}
