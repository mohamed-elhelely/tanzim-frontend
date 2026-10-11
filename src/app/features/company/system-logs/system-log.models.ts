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
}

export type AuditSeverity = 'success' | 'info' | 'warn' | 'danger' | 'secondary';

export const AUDIT_ACTION_SEVERITY: Record<AuditAction, AuditSeverity> = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  restore: 'success',
  bulk_update: 'warn',
  bulk_delete: 'danger',
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
