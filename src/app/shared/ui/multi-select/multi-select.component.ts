import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChild, forwardRef, input, output } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormControlBase } from '../form-control';
import { SelectItemDirective } from '../select/select-templates';

/**
 * A dropdown that picks several values (an array); works with `formControlName` or `ngModel`. Fills its container.
 * More than `maxSelectedLabels` picks collapse into `selectedItemsLabel` ("{0} selected").
 */
@Component({
  selector: 'app-multi-select',
  imports: [FormsModule, NgTemplateOutlet, TranslatePipe, MultiSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './multi-select.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MultiSelectComponent), multi: true }],
  host: { class: 'block w-full' },
})
export class MultiSelectComponent extends FormControlBase<unknown[]> {
  readonly options = input.required<readonly unknown[]>();
  readonly optionLabel = input('label');
  readonly optionValue = input<string>();
  readonly placeholder = input<string>();
  readonly inputId = input<string>();
  readonly ariaLabel = input<string>();
  readonly filter = input(false);
  readonly showClear = input(false);
  readonly maxSelectedLabels = input<number>();
  readonly selectedItemsLabel = input<string>();
  /** `chip`: each pick as a removable chip; `comma`: a text list. */
  readonly display = input<'comma' | 'chip'>('comma');
  readonly translateLabels = input(false);

  /** The picks changed. Typed like the library's event (see app-select's `changed`). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly changed = output<any[]>();

  readonly itemTemplate = contentChild(SelectItemDirective);

  labelOf(option: unknown): string {
    const value = option && typeof option === 'object' ? (option as Record<string, unknown>)[this.optionLabel()] : option;
    return value === null || value === undefined ? '' : String(value);
  }

  pick(values: unknown[] | null): void {
    this.update(values ?? []);
    this.changed.emit(values ?? []);
  }

  blur(): void {
    this.touch();
  }
}
