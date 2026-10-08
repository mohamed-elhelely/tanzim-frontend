import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavListComponent } from '../nav/nav-list.component';
import { BrandComponent } from './brand.component';

@Component({
  selector: 'app-sidebar',
  imports: [NavListComponent, BrandComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class AppSidebarComponent {}
