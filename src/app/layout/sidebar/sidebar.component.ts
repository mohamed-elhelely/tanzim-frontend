import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavListComponent } from '../nav/nav-list.component';
import { BrandComponent } from './brand.component';

/** Desktop sidebar: brand + navigation. */
@Component({
  selector: 'app-sidebar',
  imports: [NavListComponent, BrandComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
})
export class AppSidebarComponent {}
