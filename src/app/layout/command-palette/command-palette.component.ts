import { ChangeDetectionStrategy, Component, ElementRef, HostListener, computed, inject, signal, viewChild } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { catchError, debounceTime, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';
import { VisibleNavService } from '../nav/visible-nav.service';
import {
  GlobalSearchService,
  MIN_SEARCH_LENGTH,
  SEARCH_TYPES,
  SEARCH_TYPE_ROUTES,
  SearchHit,
  SearchType,
} from './global-search.service';

export interface PaletteEntry {
  labelKey: string;
  /** The menu group, e.g. "Sales" for "Sales orders". */
  groupKey?: string;
  icon: string;
  routerLink: string;
}

const MAX_RESULTS = 8;
/** Wait this long after the last keystroke before searching records. */
export const SEARCH_DEBOUNCE_MS = 300;

/** A group of found records of one type, under its heading. */
export interface RecordGroup {
  type: SearchType;
  headingKey: string;
  hits: SearchHit[];
}

/** One row the keyboard moves over: a screen, or a found record. */
export type PaletteItem = { kind: 'screen'; entry: PaletteEntry } | { kind: 'record'; hit: SearchHit };

interface SearchState {
  searching: boolean;
  hits: SearchHit[];
}

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
 * Ctrl+K (⌘K) jumps to any screen the user may open, by name, in either language's current labels, and from two
 * characters on also finds records (customers, orders, invoices, products, suppliers) through the global search,
 * limited to the types whose screens the user can open. Records are grouped by type under the screens.
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
  private readonly search = inject(GlobalSearchService);
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

  /** Record types whose list the user can open (the menu already applies permissions and modules). */
  readonly searchTypes = computed<SearchType[]>(() => {
    const links = new Set(this.entries().map((entry) => entry.routerLink));
    return SEARCH_TYPES.filter((type) => links.has(SEARCH_TYPE_ROUTES[type].listLink));
  });

  /**
   * Records for the query: debounced, and switchMap drops the answer to an older query when a newer one is sent.
   * A failed search just shows no records; the screens still work.
   */
  private readonly searchState = toSignal(
    toObservable(computed(() => (this.open() ? this.query().trim() : ''))).pipe(
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      switchMap((q) => {
        const types = this.searchTypes();
        if (q.length < MIN_SEARCH_LENGTH || !types.length) {
          return of<SearchState>({ searching: false, hits: [] });
        }
        return this.search.search(q, types).pipe(
          map((hits): SearchState => ({ searching: false, hits })),
          catchError(() => of<SearchState>({ searching: false, hits: [] })),
          startWith<SearchState>({ searching: true, hits: [] }),
        );
      }),
    ),
    { initialValue: { searching: false, hits: [] } as SearchState },
  );
  readonly searching = computed(() => this.searchState().searching);

  readonly recordGroups = computed<RecordGroup[]>(() => {
    const hits = this.query().trim().length >= MIN_SEARCH_LENGTH ? this.searchState().hits : [];
    return SEARCH_TYPES.map((type) => ({
      type,
      headingKey: `palette.types.${type}`,
      hits: hits.filter((hit) => hit.type === type),
    })).filter((group) => group.hits.length);
  });

  /** Everything the arrow keys move over, in display order: screens first, then each record group. */
  readonly items = computed<PaletteItem[]>(() => [
    ...this.results().map((entry): PaletteItem => ({ kind: 'screen', entry })),
    ...this.recordGroups().flatMap((group) => group.hits.map((hit): PaletteItem => ({ kind: 'record', hit }))),
  ]);

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
    const count = this.items().length;
    if (event.key === 'ArrowDown' && count) {
      event.preventDefault();
      this.active.update((index) => (index + 1) % count);
    } else if (event.key === 'ArrowUp' && count) {
      event.preventDefault();
      this.active.update((index) => (index - 1 + count) % count);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const item = this.items()[this.active()];
      if (item) {
        this.choose(item);
      }
    }
  }

  /** The keyboard index of a found record (screens come first). */
  recordIndex(hit: SearchHit): number {
    return this.items().findIndex((item) => item.kind === 'record' && item.hit === hit);
  }

  recordIcon(hit: SearchHit): string {
    return SEARCH_TYPE_ROUTES[hit.type]?.icon ?? 'pi pi-file';
  }

  choose(item: PaletteItem): void {
    if (item.kind === 'screen') {
      this.go(item.entry);
    } else {
      this.openRecord(item.hit);
    }
  }

  go(entry: PaletteEntry): void {
    this.open.set(false);
    void this.router.navigateByUrl(entry.routerLink);
  }

  openRecord(hit: SearchHit): void {
    const route = SEARCH_TYPE_ROUTES[hit.type];
    if (!route) {
      return;
    }
    this.open.set(false);
    void this.router.navigateByUrl(route.detail(hit.id));
  }
}
