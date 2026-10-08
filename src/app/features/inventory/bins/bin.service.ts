import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { Bin, BinPayload } from '../inventory.models';

@Injectable({ providedIn: 'root' })
export class BinService extends CrudApi<Bin, BinPayload> {
  protected readonly path = 'inventory/v1/bin/';
}
