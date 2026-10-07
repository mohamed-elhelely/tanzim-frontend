import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { CrudApi } from '../../core/api/crud-api';
import { City, Country, District, Region } from './location.models';

/** The backend's page_size maximum. The geo endpoints can't filter by parent, so pickers load one full page. */
export const GEO_PAGE_SIZE = 100;

/**
 * Read-only access to one level of Country → Region → City → District.
 * Creating these is out of scope for Step 5; the Location form only picks from them.
 */
@Injectable()
abstract class GeoApi<T> extends CrudApi<T, never> {
  /** First GEO_PAGE_SIZE records with their nested parent, so the form can filter by parent locally. */
  options(): Observable<T[]> {
    return this.list({ page: 1, pageSize: GEO_PAGE_SIZE, ordering: 'name_en' }).pipe(map((page) => page.items));
  }
}

@Injectable({ providedIn: 'root' })
export class CountryService extends GeoApi<Country> {
  protected readonly path = 'company/v1/country/';
}

@Injectable({ providedIn: 'root' })
export class RegionService extends GeoApi<Region> {
  protected readonly path = 'company/v1/region/';
}

@Injectable({ providedIn: 'root' })
export class CityService extends GeoApi<City> {
  protected readonly path = 'company/v1/city/';
}

@Injectable({ providedIn: 'root' })
export class DistrictService extends GeoApi<District> {
  protected readonly path = 'company/v1/district/';
}
