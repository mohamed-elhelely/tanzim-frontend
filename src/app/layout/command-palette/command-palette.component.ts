import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { LanguageService } from '../../core/services/language.service';
import { VisibleNavService } from '../nav/visible-nav.service';

export interface PaletteEntry {
  labelKey: string;
  /** The menu group, e.g. "Sales" for "Sales orders". */
  groupKey?: string;
  icon: string;
  routerLink: string;
}

const MAX_RESULTS = 8;

/** Lower-case, without Arabic diacritics and with the common letter variants folded, so "اداره" finds "إدارة". */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\p{M}/gu, '')
    .trim();
}

/**
 * Ctrl+K (⌘K) jumps to any screen the user may open, by name, in either language's current labels.
 * Global record search plugs in here once the backend has it (docs/BACKEND_REQUESTS_ROADMAP.md item 5).
 */
@Component({
  selector: 'app-command-palette',
  imports: [TranslatePipe, DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './command-palette.component.html',
})
export class CommandPaletteComponent {
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly nav = inject(VisibleNavService);
  private readonly input = viewChild<ElementRef<HTMLInputElement>>('queryInput');

  readonly open = signal(false);
  readonly query = signal('');
  readonly active = signal(0);

  /** Every screen in the visible menu, flattened; groups themselves are only headings. */
  readonly entries = computed<PaletteEntry[]>(() =>
    this.nav.items().flatMap((item) =>
      item.children
        ? item.children.map((child) => ({ labelKey: child.labelKey, groupKey: item.labelKey, icon: child.icon, routerLink: child.routerLink }))
        : [{ labelKey: item.labelKey, icon: item.icon, routerLink: item.routerLink }],
    ),
  );

  readonly results = computed(() => {
    this.language.currentLang(); // labels are re-read when the language changes
    const terms = normalizeSearch(this.query()).split(/\s+/).filter(Boolean);
    const entries = this.entries();
    if (!terms.length) {
      return entries.slice(0, MAX_RESULTS);
    }
    return entries
      .map((entry) => {
        const label = normalizeSearch(this.translate.instant(entry.labelKey));
        const haystack = `${label} ${entry.groupKey ? normalizeSearch(this.translate.instant(entry.groupKey)) : ''} ${entry.routerLink}`;
        if (!terms.every((term) => haystack.includes(term))) {
          return null;
        }
        // Labels that start with the query rank first.
        return { entry, rank: label.startsWith(terms[0]) ? 0 : 1 };
      })
      .filter((hit): hit is { entry: PaletteEntry; rank: number } => hit !== null)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, MAX_RESULTS)
      .map((hit) => hit.entry);
  });

  @HostListener('document:keydown', ['$event'])
  onGlobalKey(event: KeyboardEvent): void {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.show();
    }
  }

  show(): void {
    this.query.set('');
    this.active.set(0);
    this.open.set(true);
  }

  /** Once the dialog is on screen (focusing earlier is lost). */
  focusInput(): void {
    this.input()?.nativeElement.focus();
  }

  setQuery(value: string): void {
    this.query.set(value);
    this.active.set(0);
  }

  onKey(event: KeyboardEvent): void {
    const count = this.results().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.active.update((index) => (index + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.update((index) => (index - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const entry = this.results()[this.active()];
      if (entry) {
        this.go(entry);
      }
    }
  }

  go(entry: PaletteEntry): void {
    this.open.set(false);
    void this.router.navigateByUrl(entry.routerLink);
  }
}
