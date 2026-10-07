import { Injectable, inject, signal, computed } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'en' | 'ar';

const STORAGE_KEY = 'tanzim.lang';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly translate = inject(TranslateService);

  readonly currentLang = signal<AppLanguage>(this.readInitialLang());
  readonly direction = computed<'ltr' | 'rtl'>(() => (this.currentLang() === 'ar' ? 'rtl' : 'ltr'));

  init(): void {
    this.applyLanguage(this.currentLang());
  }

  setLanguage(lang: AppLanguage): void {
    if (lang === this.currentLang()) {
      return;
    }
    this.currentLang.set(lang);
    this.applyLanguage(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }

  toggle(): void {
    this.setLanguage(this.currentLang() === 'en' ? 'ar' : 'en');
  }

  private applyLanguage(lang: AppLanguage): void {
    this.translate.use(lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('dir', dir);
  }

  private readInitialLang(): AppLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'ar' ? 'ar' : 'en';
  }
}
