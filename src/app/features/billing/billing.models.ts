/** /api/subscriptions/v1/… (API_REFERENCE.md → "Subscriptions & platform billing"). Read-only for the company. */

export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface SubscriptionModule {
  id: number;
  module: { id: number; name: string; code: string; is_active: boolean };
  is_active: boolean;
}

export interface CurrentSubscription {
  id: number;
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

export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unit_price: string;
  amount: string;
  module_name: string | null;
}

export interface InvoiceStatusChange {
  id: number;
  from_status: InvoiceStatus | null;
  to_status: InvoiceStatus;
  reason: string;
  changed_by_email: string | null;
  created_at: string;
}

export interface PlatformInvoice {
  id: number;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_date: string | null;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  discount: string;
  discount_type: 'fixed' | 'percentage';
  total: string;
  amount_paid: string;
  amount_due: string;
  notes: string;
  items: InvoiceItem[];
  status_history: InvoiceStatusChange[];
}
