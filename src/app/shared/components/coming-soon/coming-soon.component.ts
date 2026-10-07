import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { PageHeaderComponent } from '../page-header/page-header.component';

/** Placeholder for sections that aren't built yet. */
@Component({
  selector: 'app-coming-soon',
  imports: [TranslatePipe, RouterLink, ButtonModule, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-page-header [title]="title"></app-page-header>
    <div
      class="relative overflow-hidden rounded-2xl border border-dashed border-primary-200 bg-white px-6 py-16 text-center dark:border-primary-900 dark:bg-gray-900"
    >
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary-50 to-transparent dark:from-primary-950/60"
      ></div>
      <div class="relative flex flex-col items-center gap-4">
        <span
          class="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-lg shadow-primary-500/30"
        >
          <i [class]="'pi ' + icon + ' text-2xl'"></i>
        </span>
        <span
          class="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
        >
          {{ 'common.comingSoonBadge' | translate }}
        </span>
        <p class="max-w-md text-sm text-gray-500 dark:text-gray-400">{{ 'common.comingSoon' | translate }}</p>
        <a
          pButton
          routerLink="/dashboard"
          icon="pi pi-home"
          class="p-button-outlined p-button-secondary"
          [label]="'common.backToDashboard' | translate"
        ></a>
      </div>
    </div>
  `,
})
export class ComingSoonComponent {
  @Input({ required: true }) title!: string;
  @Input() icon = 'pi-clock';
}
