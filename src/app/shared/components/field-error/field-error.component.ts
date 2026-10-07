import { Component, Input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';

/**
 * Shows one message for a touched, invalid control. Server messages win over client validators.
 * Default change detection on purpose: it must react to `touched` changes made by the parent form.
 */
@Component({
  selector: 'app-field-error',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (control.touched && control.errors; as errors) {
      <small class="text-sm text-red-600">
        @if (errors['serverError']) {
          {{ errors['serverError'] }}
        } @else if (errors['required']) {
          {{ 'validation.required' | translate }}
        } @else if (errors['email']) {
          {{ 'validation.email' | translate }}
        } @else if (errors['minlength']) {
          {{ 'validation.minLength' | translate: { min: errors['minlength'].requiredLength } }}
        } @else if (errors['maxlength']) {
          {{ 'validation.maxLength' | translate: { max: errors['maxlength'].requiredLength } }}
        }
      </small>
    }
  `,
})
export class FieldErrorComponent {
  @Input({ required: true }) control!: AbstractControl;
}
