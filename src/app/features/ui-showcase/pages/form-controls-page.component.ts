import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PasswordComponent } from '../../../shared/ui/password/password.component';
import { ToggleComponent } from '../../../shared/ui/toggle/toggle.component';
import { ShowcaseSectionComponent } from '../showcase-section.component';

@Component({
  selector: 'app-form-controls-page',
  imports: [JsonPipe, ReactiveFormsModule, PasswordComponent, ToggleComponent, ShowcaseSectionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './form-controls-page.component.html',
})
export class FormControlsPageComponent {
  readonly active = new FormControl(true);
  readonly locked = new FormControl({ value: false, disabled: true });
  readonly password = new FormControl('');

  readonly code = {
    toggle: `<app-toggle inputId="is_active" formControlName="is_active"></app-toggle>\n<label for="is_active">…</label>`,
    password: `<app-password inputId="password" formControlName="password" autocomplete="new-password"></app-password>`,
  };
}
