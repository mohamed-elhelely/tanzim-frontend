import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Country, CountryPayload } from '../locations.models';

@Injectable({ providedIn: 'root' })
export class CountryService extends CrudApi<Country, CountryPayload> {
  protected readonly path = 'company/v1/country/';
}
