/**
 * Platform billing for staff: /api/subscriptions/v1/… (API_REFERENCE.md → "Subscriptions & platform billing" and
 * "Reports (platform billing)"). The company-side read-only types live in features/billing/billing.models.ts.
 */
import { InvoiceStatus, PlatformInvoice, SubscriptionModule, SubscriptionStatus } from '../../billing/billing.models';

/** Amounts with up to 2 decimals, and whole numbers (form validators). */
export const MONEY = /^\d+(\.\d{1,2})?$/;
export const WHOLE = /^\d+$/;

export type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = ['trial', 'active', 'past_due', 'canceled', 'expired'];
export const INVOICE_STATUSES: InvoiceStatus[] = ['draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled'];

export const SUBSCRIPTION_SEVERITY: Record<SubscriptionStatus, Severity> = {
  trial: 'info',
  active: 'success',
  past_due: 'warn',
  canceled: 'secondary',
  expired: 'danger',
};

export const INVOICE_SEVERITY: Record<InvoiceStatus, Severity> = {
  draft: 'secondary',
  issued: 'info',
  partially_paid: 'warn',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'secondary',
};

export type BillingPeriod = 'monthly' | 'quarterly' | 'yearly';
export const BILLING_PERIODS: BillingPeriod[] = ['monthly', 'quarterly', 'yearly'];

/** A feature module of the catalog (`inventory`, `location`, …). */
export interface BillingModule {
  id: number;
  name: string;
  code: string;
  description: string;
  price_per_user: string;
  icon: string;
  is_active: boolean;
}

export interface BillingModulePayload {
  name: string;
  code: string;
  description?: string;
  price_per_user: string;
  icon?: string;
  is_active?: boolean;
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  billing_period: BillingPeriod;
  base_price: string;
  max_users: number | null;
  trial_days: number;
  is_featured: boolean;
  included_modules: BillingModule[];
  addon_modules: BillingModule[];
}

export interface PlanPayload {
  name: string;
  description?: string;
  billing_period?: BillingPeriod;
  base_price: string;
  max_users?: number | null;
  trial_days?: number;
  is_featured?: boolean;
  /** Write-only: a list that is sent replaces that list; a module moves out of the other list. */
  included_module_ids?: number[];
  addon_module_ids?: number[];
}

export interface Subscription {
  id: number;
  company: number;
  company_name: string;
  plan: number;
  plan_name: string;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  trial_end_date: string | null;
  next_billing_date: string;
  billing_email: string;
  licensed_users: number;
  auto_renew: boolean;
  modules: SubscriptionModule[];
  is_trial_active: boolean;
  days_remaining: number;
}

export interface SubscriptionPayload {
  company: number;
  plan: number;
  status?: SubscriptionStatus;
  start_date: string;
  end_date: string;
  trial_end_date?: string | null;
  next_billing_date: string;
  billing_email: string;
  licensed_users?: number;
  auto_renew?: boolean;
}

/** The staff view of a platform invoice: the company-side shape plus its company and permitted actions. */
export interface AdminInvoice extends PlatformInvoice {
  company_name: string;
  subscription: number;
  payment_method: string;
  items_count: number;
  can_edit: boolean;
  can_cancel: boolean;
  can_add_payment: boolean;
}

export interface InvoiceDraftPayload {
  subscription: number;
  due_date?: string;
  notes?: string;
  tax_rate?: string;
  discount?: string;
}

export interface InvoiceItemPayload {
  description: string;
  quantity: number;
  unit_price: string;
  module?: number | null;
}

export interface InvoicePaymentPayload {
  amount: string;
  transaction_id?: string;
  notes?: string;
}

export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';

export const PAYMENT_SEVERITY: Record<PaymentStatus, Severity> = {
  pending: 'info',
  completed: 'success',
  failed: 'danger',
  refunded: 'secondary',
  partially_refunded: 'warn',
};

export interface PlatformPayment {
  id: number;
  invoice: number;
  invoice_number: string;
  payment_method: number | null;
  payment_method_detail: { id: number; method_type: string; display: string; is_default: boolean } | null;
  amount: string;
  status: PaymentStatus;
  transaction_id: string;
  paid_at: string | null;
  refunded_amount: string;
  net_amount: string;
  notes: string;
  created_at: string;
}

export interface RefundPayload {
  amount: string;
  reason?: string;
}

export interface RevenueRow {
  period: string;
  total_invoiced: string;
  total_paid: string;
  total_outstanding: string;
  invoice_count: number;
  paid_count: number;
}

export interface OutstandingInvoiceRow {
  id: number;
  invoice_number: string;
  company_name: string;
  status: InvoiceStatus;
  due_date: string;
  total: string;
  amount_paid: string;
  amount_due: string;
  days_overdue: number;
}

export interface CustomerBalanceRow {
  subscription_id: number;
  company_name: string;
  plan_name: string;
  total_outstanding: string;
  overdue_count: number;
}
