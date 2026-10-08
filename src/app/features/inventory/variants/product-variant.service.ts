import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { ProductVariant, ProductVariantPayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class ProductVariantService extends CrudApi<ProductVariant, ProductVariantPayload> {
  protected readonly path = 'inventory/v1/product-variant/';
}
