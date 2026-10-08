/**
 * Types for the accounting app (/api/accounting/v1/…), checked against accounting/serializers.py.
 * Not in API_REFERENCE.md yet (BACKEND_REQUESTS 10); the serializers are the contract. Amounts are decimal strings
 * with two decimals.
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
