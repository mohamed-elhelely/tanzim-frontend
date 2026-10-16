import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';
import { MultiSelectComponent } from '../ui';

/** A choice for a list filter; `label` is a translation key. */
export interface ChoiceOption {
  value: string;
  label: string;
}

/**
 * A list filter that takes several values (status, payment method…), sent comma-separated by ServerTable.
 * Labels are translated up front so the chips and the search box inside the dropdown use the user's language.
 *
 *   <app-choice-filter [(value)]="statuses" [options]="statusOptions" placeholder="sales.fields.status" />
 */
@Component({
  selector: 'app-choice-filter',
  imports: [MultiSelectComponent, FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-multi-select
      [ngModel]="value()"
      (ngModelChange)="value.set($event ?? [])"
      [options]="translatedOptions()"
      optionLabel="label"
      optionValue="value"
      [filter]="options().length > 8"
      [showClear]="true"
      [maxSelectedLabels]="2"
      [selectedItemsLabel]="'common.selectedCount' | translate"
      [placeholder]="placeholder() | translate"
      [ariaLabel]="placeholder() | translate"
      [class]="width()"
    ></app-multi-select>
  `,
})
export class ChoiceFilterComponent {
  readonly value = model<string[]>([]);
  readonly options = input.required<readonly ChoiceOption[]>();
  /** Translation key shown when nothing is picked. */
  readonly placeholder = input.required<string>();
  /** Width classes from `sm:` up (always full width on phones). */
  readonly width = input('sm:w-52');

  private readonly translate = inject(TranslateService);
  private readonly labels = toSignal(
    toObservable(this.options).pipe(
      switchMap((options) => (options.length ? this.translate.stream(options.map((option) => option.label)) : of({}))),
    ),
    { initialValue: {} as Record<string, string> },
  );
  readonly translatedOptions = computed(() => {
    const labels = this.labels();
    return this.options().map((option) => ({ value: option.value, label: labels[option.label] ?? option.label }));
  });
}
