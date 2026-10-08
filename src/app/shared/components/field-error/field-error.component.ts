import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Shows one message for a touched, invalid control. Server messages win over client validators.
 * Default change detection on purpose: it must react to `touched` changes made by the parent form.
 */
@Component({
  selector: 'app-field-error',
  imports: [TranslatePipe],
  templateUrl: './field-error.component.html',
})
export class FieldErrorComponent {
  @Input({ required: true }) control!: AbstractControl;
  /** Translation key that explains the expected format when a `Validators.pattern` fails. */
  @Input() patternKey = 'validation.pattern';
}
