import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';

/** What `?dropdown=true` returns. */
export interface SupplierInvoiceRef {
  id: number;
  invoice_number: string;
  supplier: number;
  due_date: string | null;
  amount: string;
  currency: string;
  status: string;
  /** What is still unpaid. */
  open_balance: string;
}

/**
 * Supplier invoices (procurement). `?supplier=` and `?open=true` (payable with an open balance) narrow the list,
 * e.g. for payment allocations.
 */
@Injectable({ providedIn: 'root' })
export class SupplierInvoiceService extends CrudApi<SupplierInvoiceRef, never> {
  protected readonly path = 'inventory/v1/supplier-invoice/';
}
