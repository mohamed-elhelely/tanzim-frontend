import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Brand, BrandPayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class BrandService extends CrudApi<Brand, BrandPayload> {
  protected readonly path = 'inventory/v1/brand/';
}
