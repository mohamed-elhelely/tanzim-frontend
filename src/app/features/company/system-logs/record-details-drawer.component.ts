import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { PrimeTemplate } from 'primeng/api';
import { DrawerModule } from 'primeng/drawer';
import { TabsModule } from 'primeng/tabs';
import { LanguageService } from '../../../core/services/language.service';
import { DetailSection, RecordDetails, RecordDetailsService, detailSections } from '../../../shared/activity/record-details';
import { SystemLogListComponent } from './system-log-list.component';

/** Field labels come from the module's own translations (`inventory.fields.leadTimeDays`), else the key itself. */
const LABEL_AREAS = ['company', 'locations', 'inventory', 'sales', 'returns', 'accounting'];

/**
 * A list row's details, for records without a page of their own (brands, warehouses, departments…): its fields in
 * sections and, for users who may read the system log, an Activity log tab with that record's history. Hosted once by
 * the shell; opened from a row's "View" (RecordDetailsService).
 */
@Component({
  selector: 'app-record-details-drawer',
  imports: [TranslatePipe, PrimeTemplate, DrawerModule, TabsModule, SystemLogListComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-drawer
      [visible]="!!details.current()"
      (visibleChange)="$event || details.close()"
      [modal]="true"
      [position]="language.direction() === 'rtl' ? 'left' : 'right'"
      styleClass="w-full lg:w-[56rem]"
    >
      <ng-template pTemplate="header">
        @if (details.current(); as record) {
          <h2 class="flex min-w-0 items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            <i class="pi pi-eye text-primary-600 dark:text-primary-300" aria-hidden="true"></i>
            <span class="truncate">
              {{ record.titleKey | translate }}@if (record.name) {: <span dir="auto">{{ record.name }}</span>}
            </span>
          </h2>
        }
      </ng-template>
      @for (record of opened(); track record) {
        <p-tabs [value]="tab()" (valueChange)="tab.set($any($event))">
          <p-tablist>
            <p-tab value="details">{{ 'recordDetails.details' | translate }}</p-tab>
            @if (record.showLogs && record.resource) {
              <p-tab value="logs">{{ 'activityLog.button' | translate }}</p-tab>
            }
          </p-tablist>
          <p-tabpanels>
            <p-tabpanel value="details">
              @for (section of sections(); track section.key) {
                <section class="mb-5">
                  @if (section.key) {
                    <h3 class="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">{{ label(section.key) }}</h3>
                  }
                  <dl class="grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-gray-200 p-4 text-sm sm:grid-cols-2 dark:border-gray-800">
                    @for (field of section.fields; track field.key) {
                      <div class="min-w-0">
                        <dt class="text-xs text-gray-500 dark:text-gray-400">{{ label(field.key) }}</dt>
                        <dd class="mt-0.5 break-words" dir="auto">{{ field.translate ? (field.value | translate) : field.value }}</dd>
                      </div>
                    }
                  </dl>
                </section>
              } @empty {
                <p class="text-sm text-gray-500 dark:text-gray-400">{{ 'common.empty' | translate }}</p>
              }
            </p-tabpanel>
            @if (record.showLogs && record.resource) {
              <p-tabpanel value="logs">
                <!-- Loads only when the tab is opened. -->
                @if (tab() === 'logs') {
                  <app-system-log-list [scope]="[record.resource]" [objectId]="record.objectId"></app-system-log-list>
                }
              </p-tabpanel>
            }
          </p-tabpanels>
        </p-tabs>
      }
    </p-drawer>
  `,
})
export class RecordDetailsDrawerComponent {
  readonly details = inject(RecordDetailsService);
  readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  readonly tab = signal<'details' | 'logs'>('details');
  /** Tracked by the object: another record (or a new opening) starts on the Details tab again. */
  readonly opened = computed<RecordDetails[]>(() => {
    const record = this.details.current();
    return record ? [record] : [];
  });
  readonly sections = computed<DetailSection[]>(() => {
    const record = this.details.current();
    return record ? detailSections(record.record, this.language.currentLang()) : [];
  });

  constructor() {
    effect(() => {
      this.details.current();
      this.tab.set('details');
    });
  }

  /** `lead_time_days` → the module's "Lead time (days)" when translated, else "Lead time days". */
  label(key: string): string {
    const camel = key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    const own = this.details.current()?.labelArea;
    for (const area of own ? [own, ...LABEL_AREAS.filter((a) => a !== own)] : LABEL_AREAS) {
      const translationKey = `${area}.fields.${camel}`;
      const text = this.translate.instant(translationKey);
      if (text !== translationKey) {
        return text;
      }
    }
    const words = key.replace(/_/g, ' ').trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
}
