import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { ToolbarModule } from 'primeng/toolbar';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LanguageService } from '../../core/services/language.service';

@Component({
    selector: 'app-header',
    imports: [TranslatePipe, ButtonModule, ToolbarModule, MenuModule, AvatarModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class AppHeaderComponent {
  @Output() menuToggle = new EventEmitter<void>();

  readonly language = inject(LanguageService);

  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly pageTitleKey = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.resolveTitleKey()),
      startWith(this.resolveTitleKey()),
    ),
    { initialValue: '' },
  );

  get userMenuItems(): MenuItem[] {
    return [
      { label: this.translate.instant('header.profile'), icon: 'pi pi-user' },
      { label: this.translate.instant('header.settings'), icon: 'pi pi-cog' },
      { separator: true },
      {
        label: this.translate.instant('auth.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.auth.logout(),
      },
    ];
  }

  private resolveTitleKey(): string {
    let route = this.router.routerState.snapshot.root;
    let titleKey = '';

    while (route.firstChild) {
      route = route.firstChild;
      const key = route.data['titleKey'];
      if (typeof key === 'string') {
        titleKey = key;
      }
    }

    return titleKey;
  }
}
