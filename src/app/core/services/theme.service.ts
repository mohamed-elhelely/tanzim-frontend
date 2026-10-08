import { Injectable, signal } from '@angular/core';

export type AppTheme = 'light' | 'dark';

const STORAGE_KEY = 'tanzim.theme';

/**
 * Light/dark mode: the `dark` class on <html> drives both Tailwind (`dark:` variants) and PrimeNG
 * (`darkModeSelector: '.dark'` in app.config.ts). index.html applies the saved choice before Angular
 * starts, so the page doesn't flash.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<AppTheme>(this.readInitialTheme());

  init(): void {
    this.apply(this.theme());
  }

  toggle(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: AppTheme): void {
    this.theme.set(theme);
    this.apply(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage can be blocked; the choice then lasts for this page only.
    }
  }

  private apply(theme: AppTheme): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  private readInitialTheme(): AppTheme {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    } catch {
      // Fall through to the system preference.
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
