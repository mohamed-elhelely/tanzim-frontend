import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PrimeTemplate } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { ToastModule } from 'primeng/toast';
import { LanguageService } from '../../core/services/language.service';
import { SubscriptionService } from '../../core/subscription/subscription.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingBarComponent } from '../../shared/components/loading-bar/loading-bar.component';
import { AppHeaderComponent } from '../header/header.component';
import { NavListComponent } from '../nav/nav-list.component';
import { BrandComponent } from '../sidebar/brand.component';
import { AppSidebarComponent } from '../sidebar/sidebar.component';

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
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly language = inject(LanguageService);
  readonly mobileNavOpen = signal(false);

  constructor() {
    // The shell only renders for a signed-in user, so this runs once per sign-in.
    inject(SubscriptionService).load();
  }

  openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
