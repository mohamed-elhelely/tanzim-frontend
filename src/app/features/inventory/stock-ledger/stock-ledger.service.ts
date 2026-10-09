import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';
import { StockLedgerEntry } from '../inventory.models';

/** The stock ledger: every stock movement, read-only. */
@Injectable({ providedIn: 'root' })
export class StockLedgerService extends CrudApi<StockLedgerEntry, never> {
  protected readonly path = 'inventory/v1/stock-ledger/';
}
