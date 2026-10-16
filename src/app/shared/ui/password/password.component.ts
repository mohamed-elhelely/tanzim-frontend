import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { PasswordModule } from 'primeng/password';
import { FormControlBase } from '../form-control';

/** A password field with a show/hide toggle; works with `formControlName` or `ngModel`. Fills its container. */
@Component({
  selector: 'app-password',
  imports: [FormsModule, PasswordModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './password.component.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => PasswordComponent), multi: true }],
  host: { class: 'block w-full' },
})
export class PasswordComponent extends FormControlBase<string> {
  readonly inputId = input<string>();
  readonly placeholder = input<string>();
  /** `current-password` on sign-in forms, `new-password` where a password is chosen. */
  readonly autocomplete = input<'current-password' | 'new-password'>('current-password');

  set(text: string): void {
    this.update(text);
  }

  blur(): void {
    this.touch();
  }
}
