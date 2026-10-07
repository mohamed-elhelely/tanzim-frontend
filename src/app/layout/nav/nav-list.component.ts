import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NAV_ITEMS } from './nav-items';

@Component({
  selector: 'app-nav-list',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="flex flex-col gap-1 p-3">
      @for (item of items; track item.routerLink) {
        <a
          [routerLink]="item.routerLink"
          routerLinkActive="bg-primary-50 text-primary-700 dark:bg-gray-700 dark:text-white"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
          (click)="itemSelected.emit()"
        >
          <i [class]="item.icon + ' text-base'"></i>
          <span class="whitespace-nowrap">{{ item.labelKey | translate }}</span>
        </a>
      }
    </nav>
  `,
})
export class NavListComponent {
  readonly items = NAV_ITEMS;
  readonly itemSelected = output<void>();
}
