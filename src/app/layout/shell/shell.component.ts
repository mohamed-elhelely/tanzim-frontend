import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PrimeTemplate } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { LanguageService } from '../../core/services/language.service';
import { AccessService } from '../../core/auth/access.service';
import { NotificationCenterService } from '../../core/notifications/notification-center.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingBarComponent } from '../../shared/components/loading-bar/loading-bar.component';
import { AppHeaderComponent } from '../header/header.component';
import { NavListComponent } from '../nav/nav-list.component';
import { BrandComponent } from '../sidebar/brand.component';
import { AppSidebarComponent } from '../sidebar/sidebar.component';

/** Layout for every signed-in page: sidebar (desktop) or drawer (mobile), header, toasts and the confirm dialog. */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    PrimeTemplate,
    DrawerModule,
    ToastModule,
    LoadingBarComponent,
    AppHeaderComponent,
    AppSidebarComponent,
    NavListComponent,
    BrandComponent,
    ConfirmDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  readonly language = inject(LanguageService);
  readonly mobileNavOpen = signal(false);

  constructor() {
    // What this user may see (GET /me). Guards may already have started it; load() shares the request.
    inject(AccessService).load().subscribe();
    // Notifications list, unread count and the live socket for the header bell.
    inject(NotificationCenterService).start();
  }

  openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
