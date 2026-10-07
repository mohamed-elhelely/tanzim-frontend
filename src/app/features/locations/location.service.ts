import { Injectable } from '@angular/core';
import { CrudApi } from '../../core/api/crud-api';
import { Location, LocationPayload } from './location.models';

@Injectable({ providedIn: 'root' })
export class LocationService extends CrudApi<Location, LocationPayload> {
  protected readonly path = 'company/v1/location/';
}
