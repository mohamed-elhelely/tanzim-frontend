import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Category, CategoryPayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class CategoryService extends CrudApi<Category, CategoryPayload> {
  protected readonly path = 'inventory/v1/category/';
}
