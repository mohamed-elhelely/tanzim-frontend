import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { ServerTable } from './server-table';

/** Known filter parameters get a label; anything else shows its message alone. */
const FILTER_LABELS: Record<string, string> = {
  date_from: 'common.dateFrom',
  date_to: 'common.dateTo',
};

/** The backend's reason for refusing a filter (a 400 on the list), under the filter bar. */
@Component({
  selector: 'app-filter-errors',
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (messages().length) {
      <ul class="w-full basis-full text-sm text-red-600 dark:text-red-400" role="alert">
        @for (message of messages(); track $index) {
          <li>
            @if (message.label) {
              <span class="font-medium">{{ message.label | translate }}:</span>
            }
            {{ message.text }}
          </li>
        }
      </ul>
    }
  `,
})
export class FilterErrorsComponent {
  readonly table = input.required<ServerTable<unknown>>();
  readonly messages = computed(() =>
    Object.entries(this.table().filterErrors()).flatMap(([field, texts]) =>
      (Array.isArray(texts) ? texts : [String(texts)]).map((text) => ({ label: FILTER_LABELS[field], text })),
    ),
  );
}
