import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Product, ProductPayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class ProductService extends CrudApi<Product, ProductPayload> {
  protected readonly path = 'inventory/v1/product/';
}
