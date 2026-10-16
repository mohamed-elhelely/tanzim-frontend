import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { TooltipModule } from 'primeng/tooltip';
import { LanguageService } from '../../core/services/language.service';
import { NavListComponent } from '../nav/nav-list.component';
import { BrandComponent } from './brand.component';
import { SidebarStateService } from './sidebar-state.service';

/** Desktop sidebar: brand, navigation and the collapse toggle (icons only when collapsed). */
@Component({
  selector: 'app-sidebar',
  imports: [NavListComponent, BrandComponent, TranslatePipe, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
})
export class AppSidebarComponent {
  readonly state = inject(SidebarStateService);
  readonly direction = inject(LanguageService).direction;
}
