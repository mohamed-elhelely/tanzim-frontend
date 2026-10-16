import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FormControlBase } from '../form-control';

/** An on/off switch; works with `formControlName` or `ngModel`. Pair it with `<label [for]="inputId">`. */
@Component({
  selector: 'app-toggle',
  imports: [FormsModule, ToggleSwitchModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toggle.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => ToggleComponent), multi: true }],
  host: { class: 'inline-flex' },
})
export class ToggleComponent extends FormControlBase<boolean> {
  readonly inputId = input<string>();
  readonly ariaLabel = input<string>();

  set(checked: boolean): void {
    this.update(checked);
    this.touch();
  }
}
