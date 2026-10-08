import { Account, FiscalYear, JournalEntry } from '../features/accounting/accounting.models';

export function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 1,
    code: '1000',
    name: 'Assets',
    account_type: 'asset',
    parent: null,
    is_group: true,
    system_key: '',
    is_active: true,
    description: '',
    created_at: '2026-10-09T01:00:00+03:00',
    updated_at: '2026-10-09T01:00:00+03:00',
    ...overrides,
  };
}

/** A small chart: Assets > Cash (system), Bank; Expenses > Rent. */
export function makeChart(): Account[] {
  return [
    makeAccount(),
    makeAccount({ id: 2, code: '1100', name: 'Cash on Hand', parent: 1, is_group: false, system_key: 'cash' }),
    makeAccount({ id: 3, code: '1110', name: 'Bank', parent: 1, is_group: false }),
    makeAccount({ id: 10, code: '6000', name: 'Operating Expenses', account_type: 'expense' }),
    makeAccount({ id: 11, code: '6200', name: 'Rent', account_type: 'expense', parent: 10, is_group: false }),
  ];
}

export function makeEntry(overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id: 22,
    entry_number: 'JE-000022',
    date: '2026-10-09',
    description: 'Office rent',
    reference: 'RENT-10',
    status: 'draft',
    source_type: '',
    source_id: '',
    event: '',
    reversal_of: null,
    reversed_by: null,
    posted_at: null,
    posted_by: null,
    lines: [
      { id: 1, account: 11, account_code: '6200', account_name: 'Rent', debit: '500.00', credit: '0.00', description: '', customer: null, supplier: null },
      { id: 2, account: 3, account_code: '1110', account_name: 'Bank', debit: '0.00', credit: '500.00', description: '', customer: null, supplier: null },
    ],
    total_debit: '500.00',
    total_credit: '500.00',
    created_at: '2026-10-09T01:00:00+03:00',
    ...overrides,
  };
}

export function makeYear(overrides: Partial<FiscalYear> = {}): FiscalYear {
  return {
    id: 1,
    name: 'FY2026',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    status: 'open',
    closing_entry: null,
    closed_at: null,
    closed_by: null,
    periods: [
      { id: 1, fiscal_year: 1, name: 'Jan 2026', start_date: '2026-01-01', end_date: '2026-01-31', status: 'open', closed_at: null, closed_by: null },
      { id: 2, fiscal_year: 1, name: 'Feb 2026', start_date: '2026-02-01', end_date: '2026-02-28', status: 'closed', closed_at: null, closed_by: null },
    ],
    ...overrides,
  };
}
