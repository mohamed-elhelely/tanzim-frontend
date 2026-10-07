import { Injectable } from '@angular/core';
import { CrudApi } from '../../core/api/crud-api';
import { NamedRef } from '../company/company.models';

/** Step 4 only uses dropdown(); Step 5 (Locations) replaces the types with the full Location model. */
@Injectable({ providedIn: 'root' })
export class LocationService extends CrudApi<NamedRef, Record<string, never>> {
  protected readonly path = 'company/v1/location/';
}
