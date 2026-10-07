import { Pipe, PipeTransform } from '@angular/core';

export interface Named {
  name_en?: string | null;
  name_ar?: string | null;
  name?: string | null;
}

/** Arabic name in Arabic when it exists, otherwise the English (or plain) name. */
export function localizedName(item: Named | null | undefined, lang: string): string {
  if (!item) {
    return '';
  }
  if (lang === 'ar' && item.name_ar) {
    return item.name_ar;
  }
  return item.name_en || item.name || '';
}

/** Usage: `{{ item | localizedName: lang() }}` — pass the language so it re-renders on switch. */
@Pipe({ name: 'localizedName', standalone: true })
export class LocalizedNamePipe implements PipeTransform {
  transform(item: Named | null | undefined, lang: string): string {
    return localizedName(item, lang);
  }
}
