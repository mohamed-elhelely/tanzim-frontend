import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AnalyticsValue, isMoneyKey } from './analytics.models';

/** "days_since_last_order" → "Days since last order": the label when no translation exists. */
export function humanize(key: string): string {
  const text = key.replace(/_percent$/, ' %').replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * 🧠 The label for a report column, summary or KPI key: `<namespace>.<key>` when translated, else `fallback` (e.g. the
 * backend's English KPI name), else the key made readable. Reports can grow new columns, so a missing translation
 * must never show a raw key. Impure so it follows a language switch.
 */
@Pipe({ name: 'analyticsLabel', standalone: true, pure: false })
export class AnalyticsLabelPipe implements PipeTransform {
  private readonly translate = inject(TranslateService);

  transform(key: string, namespace = 'analytics.labels', fallback?: string): string {
    const id = `${namespace}.${key}`;
    const text = this.translate.instant(id);
    return text && text !== id ? text : fallback || humanize(key);
  }
}

const number = (value: number, digits: number, locale: string) =>
  value.toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

/**
 * A report value as text: money with two decimals, percentages with "%", other numbers up to three decimals, lists
 * joined. `null` is "—". Digits stay Latin (`en` locale) in both languages, like the rest of the app.
 */
export function formatValue(key: string, value: AnalyticsValue, locale = 'en'): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'number') {
    if (key.endsWith('_percent')) {
      return `${number(value, 2, locale)}%`;
    }
    if (isMoneyKey(key)) {
      return number(value, 2, locale);
    }
    return value.toLocaleString(locale, { maximumFractionDigits: 3 });
  }
  if (typeof value === 'boolean') {
    return value ? '✓' : '—';
  }
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatValue(key, item, locale)).join(', ') : '—';
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([name, item]) => `${humanize(name)}: ${formatValue(name, item, locale)}`)
      .join(' · ');
  }
  return String(value);
}
