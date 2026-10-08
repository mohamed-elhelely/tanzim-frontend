import { Injectable } from '@angular/core';
import { CrudApi } from '../../../core/api/crud-api';

/** What `?dropdown=true` returns. */
export interface SupplierInvoiceRef {
  id: number;
  invoice_number: string;
}

/**
 * Supplier invoices (procurement). Only used as references for now (payment allocations): the screens wait for the
 * backend to return full read serializers (BACKEND_REQUESTS 2).
 */
@Injectable({ providedIn: 'root' })
export class SupplierInvoiceService extends CrudApi<SupplierInvoiceRef, never> {
  protected readonly path = 'inventory/v1/supplier-invoice/';
}
