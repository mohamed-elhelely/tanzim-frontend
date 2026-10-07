import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { SidebarModule } from 'primeng/sidebar';
import { ToastModule } from 'primeng/toast';
import { LoadingBarComponent } from '../../shared/components/loading-bar/loading-bar.component';
import { AppHeaderComponent } from '../header/header.component';
import { NavListComponent } from '../nav/nav-list.component';
import { AppSidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    TranslatePipe,
    SidebarModule,
    ToastModule,
    LoadingBarComponent,
    AppHeaderComponent,
    AppSidebarComponent,
    NavListComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  readonly mobileNavOpen = signal(false);

  openMobileNav(): void {
    this.mobileNavOpen.set(true);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }
}
