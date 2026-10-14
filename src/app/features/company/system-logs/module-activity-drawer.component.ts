import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { LanguageService } from '../../../core/services/language.service';
import { ModuleActivityService } from '../../../shared/activity/module-activity';
import { SystemLogListComponent } from './system-log-list.component';

/**
 * The module activity log: the system log limited to one module's resources, opened from the module's page header.
 * Hosted once by the shell. Each opening starts a fresh list (page 1, no filters).
 */
@Component({
  selector: 'app-module-activity-drawer',
  imports: [TranslatePipe, PrimeTemplate, DrawerModule, SystemLogListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="!!drawer.current()"
      (visibleChange)="$event || drawer.close()"
      [modal]="true"
      [position]="language.direction() === 'rtl' ? 'left' : 'right'"
      styleClass="w-full lg:w-[72rem]"
    >
      <ng-template pTemplate="header">
        @if (drawer.current(); as activity) {
          <div class="min-w-0">
            <h2 class="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              <i class="pi pi-history text-primary-600 dark:text-primary-300" aria-hidden="true"></i>
              {{ 'activityLog.title' | translate: { module: (activity.titleKey | translate) } }}
            </h2>
            <p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{{ 'activityLog.subtitle' | translate }}</p>
          </div>
        }
      </ng-template>
      <!-- Tracked by the object, so another module (or a new opening) gets a new list. -->
      @for (activity of opened(); track activity) {
        <app-system-log-list [scope]="activity.resources"></app-system-log-list>
      }
    </p-drawer>
  `,
})
export class ModuleActivityDrawerComponent {
  readonly drawer = inject(ModuleActivityService);
  readonly language = inject(LanguageService);
  readonly opened = computed(() => {
    const activity = this.drawer.current();
    return activity ? [activity] : [];
  });
}
