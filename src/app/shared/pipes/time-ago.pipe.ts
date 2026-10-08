import { Pipe, PipeTransform } from '@angular/core';

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
];

/** "3 hours ago" / "منذ 3 ساعات" for an ISO date, in the given language. */
export function timeAgo(iso: string | null | undefined, lang: string, now = Date.now()): string {
  if (!iso) {
    return '';
  }
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return format.format(Math.round(seconds / size), unit);
    }
  }
  return format.format(0, 'minute');
}

/** Not live: the text updates whenever the template re-renders (enough for lists that reload). */
@Pipe({ name: 'timeAgo', standalone: true })
export class TimeAgoPipe implements PipeTransform {
  transform(iso: string | null | undefined, lang: string): string {
    return timeAgo(iso, lang);
  }
}
