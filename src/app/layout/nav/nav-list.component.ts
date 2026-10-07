import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { filter } from 'rxjs';
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
  template: `
    <nav class="flex flex-col gap-1 px-3 pb-4 pt-2">
      @for (item of items; track item.routerLink) {
        @if (item.children) {
          <button
            type="button"
            [class]="linkClasses + ' w-full' + (isActiveGroup(item) ? ' !text-white' : '')"
            [attr.aria-expanded]="isExpanded(item)"
            (click)="toggle(item)"
          >
            <i [class]="item.icon + ' text-base'"></i>
            <span class="flex-1 whitespace-nowrap text-start">{{ item.labelKey | translate }}</span>
            <i
              class="pi text-xs"
              [class.pi-chevron-down]="isExpanded(item)"
              [class.pi-chevron-right]="!isExpanded(item) && direction() === 'ltr'"
              [class.pi-chevron-left]="!isExpanded(item) && direction() === 'rtl'"
            ></i>
          </button>
          @if (isExpanded(item)) {
            <div class="ms-5 flex flex-col gap-0.5 border-s border-white/10 ps-2">
              @for (child of item.children; track child.routerLink) {
                <a
                  [routerLink]="child.routerLink"
                  [routerLinkActive]="activeClasses"
                  [class]="linkClasses"
                  (click)="itemSelected.emit()"
                >
                  <i [class]="child.icon + ' text-sm'"></i>
                  <span class="whitespace-nowrap">{{ child.labelKey | translate }}</span>
                </a>
              }
            </div>
          }
        } @else {
          <a
            [routerLink]="item.routerLink"
            [routerLinkActive]="activeClasses"
            [class]="linkClasses"
            (click)="itemSelected.emit()"
          >
            <i [class]="item.icon + ' text-base'"></i>
            <span class="whitespace-nowrap">{{ item.labelKey | translate }}</span>
          </a>
        }
      }
    </nav>
  `,
})
export class NavListComponent {
  private readonly router = inject(Router);
  private readonly expanded = signal<ReadonlySet<string>>(new Set());

  readonly items = NAV_ITEMS;
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
    for (const item of this.items) {
      if (item.children && (url === item.routerLink || url.startsWith(`${item.routerLink}/`))) {
        this.expanded.update((current) => new Set(current).add(item.routerLink));
      }
    }
  }
}
