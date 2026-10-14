import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';
import { NAV_ITEMS, NavItem } from './nav-items';
import { VisibleNavService } from './visible-nav.service';

// The navigation always sits on the dark sidebar (desktop) or drawer (mobile), in the secondary brand color.
const LINK_CLASSES =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-secondary-200 transition-colors hover:bg-white/5 hover:text-white';
const ACTIVE_CLASSES = '!bg-primary-600 !text-white shadow-md shadow-secondary-950/40';

@Component({
  selector: 'app-nav-list',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav-list.component.html',
})
export class NavListComponent {
  private readonly router = inject(Router);
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  /** The menu this user may see (see VisibleNavService). */
  readonly items = inject(VisibleNavService).items;
  readonly itemSelected = output<void>();
  readonly direction = inject(LanguageService).direction;
  readonly linkClasses = LINK_CLASSES;
  readonly activeClasses = ACTIVE_CLASSES;

  constructor() {
    this.expandActiveGroup(this.router.url);
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.expandActiveGroup(event.urlAfterRedirects));
  }

  /** True when the current page is inside this group, so a collapsed group still shows where you are. */
  isActiveGroup(item: NavItem): boolean {
    const url = this.router.url;
    return url === item.routerLink || url.startsWith(`${item.routerLink}/`);
  }

  isExpanded(item: NavItem): boolean {
    return this.expanded().has(item.routerLink);
  }

  toggle(item: NavItem): void {
    this.expanded.update((current) => {
      const next = new Set(current);
      if (next.has(item.routerLink)) {
        next.delete(item.routerLink);
      } else {
        next.add(item.routerLink);
      }
      return next;
    });
  }

  private expandActiveGroup(url: string): void {
    // All items, not just the visible ones: a gated group appears only once /me has loaded.
    for (const item of NAV_ITEMS) {
      if (item.children && (url === item.routerLink || url.startsWith(`${item.routerLink}/`))) {
        this.expanded.update((current) => new Set(current).add(item.routerLink));
      }
    }
  }
}
