/**
 * The system log (audit log): one row per change to company data, written by the backend in the same transaction
 * as the change. Contract: docs/BACKEND_REQUESTS_ROADMAP.md item 1.
 */
export const AUDIT_ACTIONS = [
  'create',
  'update',
  'delete',
  'restore',
  'bulk_update',
  'bulk_delete',
  'bulk_create',
  'import',
  'login',
  'login_failed',
  'logout',
  'password_change',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_SOURCES = ['api', 'admin', 'import', 'task', 'system'] as const;
export type AuditSource = (typeof AUDIT_SOURCES)[number];

/** A field change: `[old, new]`; many-to-many fields list what was added and removed. */
export type AuditFieldChange = [unknown, unknown] | { added: unknown[]; removed: unknown[] };

/** Why a sign-in failed (`meta.reason` on `login_failed`). */
export const AUDIT_LOGIN_FAILURE_REASONS = ['invalid_credentials', 'company_inactive'] as const;

/**
 * Extra facts about the entry: bulk actions and imports say how many records they touched (and which), a failed
 * sign-in says why. Other keys may come; they are shown as they are.
 */
export interface AuditLogMeta {
  count?: number;
  ids?: (number | string)[];
  reason?: string;
  [key: string]: unknown;
}

export interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: AuditAction;
  source: AuditSource;
  /** Null for changes made by the system itself (scheduled tasks). */
  user: { id: number; email: string; first_name: string; last_name: string } | null;
  /** The permission-catalog resource, e.g. `salesorder`. */
  resource: string;
  object_id: string;
  object_repr: string;
  changes: Record<string, AuditFieldChange>;
  ip_address: string | null;
  user_agent: string;
  request_id: string;
  /** The company the entry belongs to; platform staff see every company's entries. */
  company?: number | { id: number; name: string } | null;
  meta?: AuditLogMeta | null;
}

export type AuditSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

export const AUDIT_ACTION_SEVERITY: Record<AuditAction, AuditSeverity> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  restore: 'success',
  bulk_update: 'warn',
  bulk_delete: 'danger',
  bulk_create: 'success',
  import: 'info',
  login: 'secondary',
  login_failed: 'warn',
  logout: 'secondary',
  password_change: 'warn',
};

/** One row of the change table in the detail drawer. */
export interface AuditChangeRow {
  field: string;
  before: string;
  after: string;
}

/** Flattens `changes` into display rows; many-to-many changes become "removed" → "added". */
export function auditChangeRows(changes: Record<string, AuditFieldChange> | null | undefined): AuditChangeRow[] {
  return Object.entries(changes ?? {}).map(([field, change]) =>
    Array.isArray(change)
      ? { field, before: displayValue(change[0]), after: displayValue(change[1]) }
      : { field, before: listValue(change.removed), after: listValue(change.added) },
  );
}

function listValue(values: unknown[] | undefined): string {
  return values?.length ? values.map(displayValue).join(', ') : '—';
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** The company's name when the row carries it, otherwise its id (for staff, who see every company). */
export function auditCompanyLabel(company: AuditLogEntry['company'], names: ReadonlyMap<number, string>): string {
  if (company === null || company === undefined) {
    return '—';
  }
  if (typeof company === 'object') {
    return company.name || String(company.id);
  }
  return names.get(company) ?? String(company);
}

/** One line of the drawer's "details" list: a translation key and its value. */
export interface AuditMetaRow {
  labelKey: string;
  value: string;
  /** Translate `value` too (e.g. the reason a sign-in failed). */
  translateValue?: boolean;
}

/** `meta` as display rows: count, ids and the sign-in failure reason get labels, other keys show as they come. */
export function auditMetaRows(meta: AuditLogMeta | null | undefined): AuditMetaRow[] {
  return Object.entries(meta ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]): AuditMetaRow => {
      if (key === 'count' || key === 'ids') {
        return { labelKey: `systemLogs.meta.${key}`, value: Array.isArray(value) ? listValue(value) : displayValue(value) };
      }
      if (key === 'reason') {
        const known = (AUDIT_LOGIN_FAILURE_REASONS as readonly unknown[]).includes(value);
        return known
          ? { labelKey: 'systemLogs.meta.reason', value: `systemLogs.reasons.${value}`, translateValue: true }
          : { labelKey: 'systemLogs.meta.reason', value: displayValue(value) };
      }
      return { labelKey: key, value: Array.isArray(value) ? listValue(value) : displayValue(value) };
    });
}
