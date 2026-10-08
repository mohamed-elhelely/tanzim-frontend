import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { AccessService } from '../../core/auth/access.service';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { NAV_ITEMS, NavItem } from './nav-items';

// The navigation always sits on the dark indigo sidebar (desktop) or drawer (mobile).
const LINK_CLASSES =
  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-primary-200 transition-colors hover:bg-white/5 hover:text-white';
const ACTIVE_CLASSES = '!bg-primary-600 !text-white shadow-md shadow-primary-950/40';

@Component({
  selector: 'app-nav-list',
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nav-list.component.html',
})
export class NavListComponent {
  private readonly router = inject(Router);
  private readonly role = inject(AuthService).role;
  private readonly access = inject(AccessService);
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  /** The menu this user may see: by role, staff flag, subscription module and permission; empty groups drop out. */
  readonly items = computed(() =>
    NAV_ITEMS.filter((item) => this.visible(item))
      .map((item) => (item.children ? { ...item, children: item.children.filter((child) => this.visible(child)) } : item))
      .filter((item) => !item.children || item.children.length > 0),
  );
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

  private visible(item: NavItem): boolean {
    const role = this.role();
    return (
      (!item.roles || (role !== null && item.roles.includes(role))) &&
      (!item.staffOnly || this.access.isStaff()) &&
      (!item.module || this.access.hasModule(item.module)) &&
      (!item.permission || this.access.can(item.permission))
    );
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
