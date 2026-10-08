import { ChangeDetectionStrategy, Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { PopoverModule } from 'primeng/popover';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AppNotification } from '../../core/notifications/notification.model';
import { NotificationCenterService } from '../../core/notifications/notification-center.service';
import { LanguageService } from '../../core/services/language.service';
import { ThemeService } from '../../core/services/theme.service';
import { NotificationItemComponent } from '../../shared/components/notification-item/notification-item.component';
import { NAV_ITEMS } from '../nav/nav-items';

interface RouteInfo {
  titleKey: string;
  sectionKey: string;
}

/** Top bar: breadcrumb from the route data (titleKey) and the nav group, language and theme toggles, user menu. */
@Component({
  selector: 'app-header',
  imports: [TranslatePipe, RouterLink, ButtonModule, MenuModule, PopoverModule, NotificationItemComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
})
export class AppHeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();

  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly auth = inject(AuthService);
  readonly notifications = inject(NotificationCenterService);
  /** The bell shows the latest few; the notifications page shows them all. */
  readonly latest = computed(() => this.notifications.items().slice(0, 6));

  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  private readonly routeInfo = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.resolveRouteInfo()),
      startWith(this.resolveRouteInfo()),
    ),
    { initialValue: { titleKey: '', sectionKey: '' } },
  );

  readonly pageTitleKey = computed(() => this.routeInfo().titleKey);
  /** The sidebar group the page belongs to (e.g. "Company"), shown before the title. */
  readonly sectionKey = computed(() => this.routeInfo().sectionKey);

  readonly displayName = computed(() => this.auth.user()?.name || this.translate.instant('header.account'));
  readonly initials = computed(() => {
    const name = this.auth.user()?.name?.trim();
    if (!name) {
      return '?';
    }
    const parts = name.split(/[\s@._-]+/).filter(Boolean);
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?';
  });

  openNotification(notification: AppNotification): void {
    this.notifications.markRead(notification);
  }

  get userMenuItems(): MenuItem[] {
    return [
      {
        label: this.translate.instant('auth.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.auth.logout(),
      },
    ];
  }

  private resolveRouteInfo(): RouteInfo {
    let route = this.router.routerState.snapshot.root;
    let titleKey = '';
    while (route.firstChild) {
      route = route.firstChild;
      const key = route.data['titleKey'];
      if (typeof key === 'string') {
        titleKey = key;
      }
    }
    const url = this.router.url;
    const group = NAV_ITEMS.find(
      (item) => item.children && (url === item.routerLink || url.startsWith(`${item.routerLink}/`)),
    );
    return { titleKey, sectionKey: group?.labelKey ?? '' };
  }
}
