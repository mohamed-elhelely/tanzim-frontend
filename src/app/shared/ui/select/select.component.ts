import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChild, forwardRef, input, output } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { SelectModule } from 'primeng/select';
import { FormControlBase } from '../form-control';
import { SelectGroupDirective, SelectItemDirective, SelectSelectedDirective } from './select-templates';

/**
 * A dropdown; works with `formControlName` or `ngModel`, and `(changed)` gives the new value after the user picks.
 * It fills its container; put width classes on the element (`class="sm:w-56"`). Options whose `optionLabel` is a
 * translation key use `[translateLabels]="true"`; anything richer uses `<ng-template appSelectItem let-option>`.
 */
@Component({
  selector: 'app-select',
  imports: [FormsModule, NgTemplateOutlet, TranslatePipe, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './select.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SelectComponent), multi: true }],
  host: { class: 'block w-full' },
})
export class SelectComponent extends FormControlBase<unknown> {
  readonly options = input.required<readonly unknown[]>();
  readonly optionLabel = input('label');
  /** The option field that becomes the value; without it the whole option is the value. */
  readonly optionValue = input<string>();
  readonly placeholder = input<string>();
  readonly inputId = input<string>();
  readonly ariaLabel = input<string>();
  /** A search box above the options; `filterBy` lists the fields it searches (default: the label). */
  readonly filter = input(false);
  readonly filterBy = input<string>();
  /** An × that clears the value. */
  readonly showClear = input(false);
  /** Empty means the library's own "no results" text. */
  readonly emptyMessage = input('');
  /** `optionLabel` holds translation keys. */
  readonly translateLabels = input(false);
  readonly group = input(false);
  readonly optionGroupLabel = input<string>();
  readonly optionGroupChildren = input('items');
  /** The user may also type a value that is not in the list. */
  readonly editable = input(false);

  /** The user picked (or cleared) a value. */
  readonly changed = output<unknown>();

  readonly itemTemplate = contentChild(SelectItemDirective);
  readonly selectedTemplate = contentChild(SelectSelectedDirective);
  readonly groupTemplate = contentChild(SelectGroupDirective);

  labelOf(option: unknown): string {
    const value = option && typeof option === 'object' ? (option as Record<string, unknown>)[this.optionLabel()] : option;
    return value === null || value === undefined ? '' : String(value);
  }

  pick(value: unknown): void {
    this.update(value);
    this.changed.emit(value);
  }

  blur(): void {
    this.touch();
  }
}
