import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

export type AppDateFormat = 'datetime' | 'date' | 'seconds';

/** The app's date formats in one place: numeric, the same in both languages (shown in `dir="ltr"` spans). */
const FORMATS: Record<AppDateFormat, string> = {
  datetime: 'yyyy-MM-dd HH:mm',
  date: 'yyyy-MM-dd',
  seconds: 'yyyy-MM-dd HH:mm:ss',
};

/** `{{ order.approved_at | appDate }}`, `| appDate: 'date'`, `| appDate: 'seconds'`; empty values show "—". */
@Pipe({ name: 'appDate' })
export class AppDatePipe implements PipeTransform {
  transform(value: string | number | Date | null | undefined, format: AppDateFormat = 'datetime'): string {
    if (value === null || value === undefined || value === '') {
      return '—';
    }
    return formatDate(value, FORMATS[format], 'en-US');
  }
}
