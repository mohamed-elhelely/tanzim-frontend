/**
 * Types for the accounting app (/api/accounting/v1/…), API_REFERENCE.md → "Accounting", checked against
 * accounting/serializers.py. Amounts are decimal strings with two decimals.
 */

export type Severity = 'success' | 'secondary' | 'info' | 'warn' | 'danger';

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'cost_of_sales', 'expense'] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export interface Account {
  id: number;
  code: string;
  name: string;
  account_type: AccountType;
  parent: number | null;
  is_group: boolean;
  /** Set on the accounts the system posts to (cash, receivables, inventory…): type locked, can't be deleted. */
  system_key: string;
  is_active: boolean;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface AccountPayload {
  code: string;
  name: string;
  account_type: AccountType;
  parent: number | null;
  is_group: boolean;
  is_active: boolean;
  description: string;
}

export type JournalStatus = 'draft' | 'posted';

export interface JournalLine {
  id: number;
  account: number;
  account_code: string;
  account_name: string;
  debit: string;
  credit: string;
  description: string;
  customer: number | null;
  supplier: number | null;
}

export interface JournalEntry {
  id: number;
  entry_number: string;
  date: string;
  description: string;
  reference: string;
  status: JournalStatus;
  /** Empty for manual entries; e.g. "SalesInvoice" or "StockLedger" for automatic ones. */
  source_type: string;
  source_id: string;
  event: string;
  reversal_of: number | null;
  reversed_by: number | null;
  posted_at: string | null;
  posted_by: number | null;
  lines: JournalLine[];
  total_debit: string;
  total_credit: string;
  created_at: string;
}

export interface JournalLinePayload {
  account: number;
  debit: string;
  credit: string;
  description: string;
}

/** Saving with `post: true` posts the entry in the same request. */
export interface JournalEntryPayload {
  date: string;
  description: string;
  reference: string;
  lines: JournalLinePayload[];
  post: boolean;
}

export type PeriodStatus = 'open' | 'closed';

export interface FiscalPeriod {
  id: number;
  fiscal_year: number;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  closed_at: string | null;
  closed_by: number | null;
}

export interface FiscalYear {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  status: PeriodStatus;
  closing_entry: number | null;
  closed_at: string | null;
  closed_by: number | null;
  periods: FiscalPeriod[];
}

/** Creating a year creates its monthly periods; afterwards only the name can change. */
export interface FiscalYearPayload {
  name: string;
  start_date: string;
  end_date: string;
}

export const ACCOUNT_TYPE_SEVERITY: Record<AccountType, Severity> = {
  asset: 'info',
  liability: 'warn',
  equity: 'secondary',
  revenue: 'success',
  cost_of_sales: 'danger',
  expense: 'danger',
};

// Reports (GET reports/<type>/): every report answers { columns, rows, summary }.

export const REPORT_TYPES = [
  'trial_balance',
  'income_statement',
  'balance_sheet',
  'general_ledger',
  'customer_statement',
  'supplier_statement',
  'receivables_aging',
  'payables_aging',
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export type ReportParam = 'start_date' | 'end_date' | 'as_of_date' | 'account' | 'customer' | 'supplier';

/** Mirrors REPORT_PARAMS in accounting/services/reports.py. account / customer / supplier are required there. */
export const REPORT_PARAMS: Record<ReportType, ReportParam[]> = {
  trial_balance: ['start_date', 'end_date'],
  income_statement: ['start_date', 'end_date'],
  balance_sheet: ['as_of_date'],
  general_ledger: ['account', 'start_date', 'end_date'],
  customer_statement: ['customer', 'start_date', 'end_date'],
  supplier_statement: ['supplier', 'start_date', 'end_date'],
  receivables_aging: ['as_of_date'],
  payables_aging: ['as_of_date'],
};

export type ReportValue = string | number | boolean | null;

export interface ReportResult {
  report_type: ReportType;
  columns: string[];
  rows: Record<string, ReportValue>[];
  summary: Record<string, ReportValue>;
}

// Payables: supplier payments and debit notes.

export const SUPPLIER_PAYMENT_METHODS = ['bank_transfer', 'cash', 'check', 'credit_card', 'other'] as const;
export type SupplierPaymentMethod = (typeof SUPPLIER_PAYMENT_METHODS)[number];

export interface SupplierPaymentAllocation {
  id: number;
  invoice: number;
  invoice_number: string;
  amount: string;
}

export interface SupplierPayment {
  id: number;
  payment_number: string;
  supplier: number;
  supplier_name: string;
  payment_date: string;
  amount: string;
  payment_method: SupplierPaymentMethod;
  reference: string;
  notes: string;
  status: 'completed' | 'voided';
  allocations: SupplierPaymentAllocation[];
  allocated_amount: string;
  unallocated_amount: string;
  voided_at: string | null;
  void_reason: string;
  created_at: string;
}

/** Payments are never edited: they're recorded once and voided if wrong. */
export interface SupplierPaymentPayload {
  supplier: number;
  payment_date: string;
  amount: string;
  payment_method: SupplierPaymentMethod;
  reference: string;
  notes: string;
  allocations: { invoice: number; amount: string }[];
}

export type DebitNoteStatus = 'draft' | 'issued' | 'cancelled';

export interface DebitNote {
  id: number;
  note_number: string;
  supplier: number;
  supplier_name: string;
  supplier_invoice: number | null;
  supplier_return: number | null;
  date: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  supplier_reference: string;
  reason: string;
  status: DebitNoteStatus;
  issued_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string;
  created_at: string;
}

export interface DebitNotePayload {
  supplier: number;
  supplier_invoice: number | null;
  supplier_return: number | null;
  date: string;
  subtotal: string;
  tax_amount: string;
  supplier_reference: string;
  reason: string;
}

export const DEBIT_NOTE_SEVERITY: Record<DebitNoteStatus, Severity> = {
  draft: 'secondary',
  issued: 'success',
  cancelled: 'danger',
};
