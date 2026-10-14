import { ChangeDetectionStrategy, Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';

/**
 * "From … To …" document-date filter (`date_from` / `date_to`, YYYY-MM-DD, both inclusive). Each end limits the
 * other so the range can't be picked backwards.
 *
 *   <app-date-range-filter [(from)]="dateFrom" [(to)]="dateTo" />
 */
@Component({
  selector: 'app-date-range-filter',
  imports: [FormsModule, TranslatePipe, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <label class="flex items-center gap-2 text-sm">
      <span class="text-gray-500 dark:text-gray-400">{{ 'common.dateFrom' | translate }}</span>
      <input
        pInputText
        type="date"
        [ngModel]="from()"
        (ngModelChange)="from.set($event ?? '')"
        [max]="to() || null"
        class="w-full sm:w-40"
      />
    </label>
    <label class="flex items-center gap-2 text-sm">
      <span class="text-gray-500 dark:text-gray-400">{{ 'common.dateTo' | translate }}</span>
      <input
        pInputText
        type="date"
        [ngModel]="to()"
        (ngModelChange)="to.set($event ?? '')"
        [min]="from() || null"
        class="w-full sm:w-40"
      />
    </label>
  `,
})
export class DateRangeFilterComponent {
  readonly from = model('');
  readonly to = model('');
}
