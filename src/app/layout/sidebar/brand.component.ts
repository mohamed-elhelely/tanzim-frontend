import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

/** Logo + app name at the top of the sidebar and the mobile drawer. */
@Component({
  selector: 'app-brand',
  imports: [RouterLink, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a routerLink="/dashboard" class="flex h-16 items-center gap-3 px-5">
      <span
        class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 text-white shadow-lg shadow-primary-900/40"
      >
        <i class="pi pi-box text-base"></i>
      </span>
      <span class="flex flex-col leading-tight">
        <span class="text-base font-bold text-white">{{ 'app.name' | translate }}</span>
        <span class="text-xs text-primary-300">{{ 'app.tagline' | translate }}</span>
      </span>
    </a>
  `,
})
export class BrandComponent {}
