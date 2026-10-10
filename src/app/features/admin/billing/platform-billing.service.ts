import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../../core/api/base-api.service';
import { CrudApi } from '../../../core/api/crud-api';
import {
  AdminInvoice,
  BillingModule,
  BillingModulePayload,
  CustomerBalanceRow,
  InvoiceDraftPayload,
  InvoiceItemPayload,
  InvoicePaymentPayload,
  OutstandingInvoiceRow,
  Plan,
  PlanPayload,
  PlatformPayment,
  RefundPayload,
  RevenueRow,
  Subscription,
  SubscriptionPayload,
} from './platform-billing.models';

/** Plans catalog: public read, staff write. */
@Injectable({ providedIn: 'root' })
export class PlanService extends CrudApi<Plan, PlanPayload> {
  protected readonly path = 'subscriptions/v1/plans/';
}

/** Feature modules catalog: read for everyone, staff write. */
@Injectable({ providedIn: 'root' })
export class BillingModuleService extends CrudApi<BillingModule, BillingModulePayload> {
  protected readonly path = 'subscriptions/v1/modules/';
}

/** Every company's subscriptions for staff (`?company=`, `?status=` filters); writes are staff-only. */
@Injectable({ providedIn: 'root' })
export class SubscriptionService extends CrudApi<Subscription, SubscriptionPayload> {
  protected readonly path = 'subscriptions/v1/subscriptions/';

  addModule(id: number, moduleId: number): Observable<void> {
    return this.post<unknown>(`${this.detailPath(id)}add_module/`, { module_id: moduleId }).pipe(map(() => undefined));
  }

  removeModule(id: number, moduleId: number): Observable<void> {
    return this.post<unknown>(`${this.detailPath(id)}remove_module/`, { module_id: moduleId }).pipe(map(() => undefined));
  }
}

/** Platform invoices of every company (staff), with the draft → issue → paid workflow. */
@Injectable({ providedIn: 'root' })
export class AdminInvoiceService extends CrudApi<AdminInvoice, Partial<AdminInvoice>> {
  protected readonly path = 'subscriptions/v1/invoices/';

  createDraft(body: InvoiceDraftPayload): Observable<AdminInvoice> {
    return this.action(`${this.path}create_draft/`, body);
  }

  addItem(id: number, body: InvoiceItemPayload): Observable<AdminInvoice> {
    return this.action(`${this.detailPath(id)}add_item/`, body);
  }

  updateItem(id: number, itemId: number, body: Partial<InvoiceItemPayload>): Observable<AdminInvoice> {
    return this.patch<AdminInvoice>(`${this.detailPath(id)}items/${itemId}/`, body).pipe(map((r) => r.data as AdminInvoice));
  }

  removeItem(id: number, itemId: number): Observable<AdminInvoice> {
    return this.delete<AdminInvoice>(`${this.detailPath(id)}items/${itemId}/`).pipe(map((r) => r.data as AdminInvoice));
  }

  issue(id: number): Observable<AdminInvoice> {
    return this.action(`${this.detailPath(id)}issue/`);
  }

  /** Answers with the new payment (not the invoice, unlike the other actions): reload the invoice after it. */
  addPayment(id: number, body: InvoicePaymentPayload): Observable<PlatformPayment> {
    return this.post<PlatformPayment>(`${this.detailPath(id)}add_payment/`, body).pipe(map((r) => r.data as PlatformPayment));
  }

  markPaid(id: number): Observable<AdminInvoice> {
    return this.action(`${this.detailPath(id)}mark_paid/`);
  }

  cancel(id: number, reason: string): Observable<AdminInvoice> {
    return this.action(`${this.detailPath(id)}cancel/`, reason ? { reason } : {});
  }

  private action(path: string, body?: unknown): Observable<AdminInvoice> {
    return this.post<AdminInvoice>(path, body).pipe(map((r) => r.data as AdminInvoice));
  }
}

/** Payments of every company (staff); only refunds can be written. */
@Injectable({ providedIn: 'root' })
export class PlatformPaymentService extends CrudApi<PlatformPayment, never> {
  protected readonly path = 'subscriptions/v1/payments/';

  refund(id: number, body: RefundPayload): Observable<PlatformPayment> {
    return this.post<PlatformPayment>(`${this.detailPath(id)}refund/`, body).pipe(map((r) => r.data as PlatformPayment));
  }
}

/** Platform billing reports: every company for staff. */
@Injectable({ providedIn: 'root' })
export class BillingReportService extends BaseApiService {
  revenue(year: number): Observable<RevenueRow[]> {
    return this.get<RevenueRow[]>('subscriptions/v1/reports/revenue_summary/', { params: { year } }).pipe(map((r) => r.data ?? []));
  }

  outstanding(): Observable<OutstandingInvoiceRow[]> {
    return this.get<OutstandingInvoiceRow[]>('subscriptions/v1/reports/outstanding_invoices/').pipe(map((r) => r.data ?? []));
  }

  balances(): Observable<CustomerBalanceRow[]> {
    return this.get<CustomerBalanceRow[]>('subscriptions/v1/reports/customer_balances/').pipe(map((r) => r.data ?? []));
  }
}
