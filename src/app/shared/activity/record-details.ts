import { Injectable, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { localizedName } from '../pipes/localized-name.pipe';

/** What the record details drawer shows: a list row's fields and, when allowed, that record's activity log. */
export interface RecordDetails {
  /** The module's name (translation key), e.g. `nav.brands`. */
  titleKey: string;
  /** The record's name for the title. */
  name?: string;
  record: Readonly<Record<string, unknown>>;
  /** For the Activity log tab: the record's audit resource and id. */
  resource?: string;
  objectId?: string | number;
  /** The user may read the system log. */
  showLogs: boolean;
  /** Translation area for field labels, from the screen's path (`inventory` → `inventory.fields.*`). */
  labelArea?: string;
}

/** One field: its key (for the label lookup) and its value as text; `translate` when the value is a key. */
export interface DetailField {
  key: string;
  value: string;
  translate?: boolean;
}

/** A group of fields; `key` names a nested object (an address), null for the record's own fields. */
export interface DetailSection {
  key: string | null;
  fields: DetailField[];
}

/** Never shown: ids, the tenant and anything secret. The record's own fields come from an API the user may read. */
const HIDDEN = new Set(['id', 'company', 'password', 'token', 'secret']);
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * A row's fields as sections: its own values first, then one section per nested object that is not just a reference
 * (an address, the user account of a company user). References (`{ id, name }`) show as their name, lists as their
 * names (or how many there are).
 */
export function detailSections(record: Readonly<Record<string, unknown>>, lang: string): DetailSection[] {
  const own: DetailField[] = [];
  const nested: DetailSection[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (HIDDEN.has(key)) {
      continue;
    }
    if (isPlainObject(value) && !isReference(value)) {
      const fields = Object.entries(value)
        .filter(([k, v]) => !HIDDEN.has(k) && !isPlainObject(v))
        .map(([k, v]) => field(k, v, lang));
      if (fields.length) {
        nested.push({ key, fields });
      }
      continue;
    }
    own.push(field(key, value, lang));
  }
  return [{ key: null, fields: own }, ...nested];
}

function field(key: string, value: unknown, lang: string): DetailField {
  if (typeof value === 'boolean') {
    return { key, value: value ? 'common.yes' : 'common.no', translate: true };
  }
  return { key, value: text(value, lang) };
}

function text(value: unknown, lang: string): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (Array.isArray(value)) {
    if (!value.length) {
      return '—';
    }
    const names = value.map((item) => (isPlainObject(item) ? referenceName(item, lang) : String(item))).filter(Boolean);
    return names.length === value.length ? names.join(', ') : String(value.length);
  }
  if (isPlainObject(value)) {
    return referenceName(value, lang) || '—';
  }
  if (typeof value === 'string' && ISO_DATETIME.test(value)) {
    return value.slice(0, 16).replace('T', ' ');
  }
  return String(value);
}

function referenceName(value: Record<string, unknown>, lang: string): string {
  const name = localizedName(value as { name?: string; name_en?: string; name_ar?: string }, lang);
  return name || String(value['code'] ?? value['sku'] ?? value['email'] ?? value['id'] ?? '');
}

/** A link to another record, shown by its name: an id plus a name-like field and little else. */
function isReference(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  const named = ['name', 'name_en', 'name_ar', 'code', 'sku'].some((k) => k in value);
  return 'id' in value && named && keys.length <= 6;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Opens the record details drawer (hosted once by the shell); leaving the page closes it. */
@Injectable({ providedIn: 'root' })
export class RecordDetailsService {
  private readonly state = signal<RecordDetails | null>(null);
  readonly current = this.state.asReadonly();

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => this.close());
  }

  open(details: RecordDetails): void {
    this.state.set(details);
  }

  close(): void {
    this.state.set(null);
  }
}
