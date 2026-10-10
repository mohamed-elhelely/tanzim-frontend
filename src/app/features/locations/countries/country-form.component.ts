import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { FormLayoutComponent } from '../../../shared/components/form-layout/form-layout.component';
import { injectFormContext } from '../../../shared/forms/form-context';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { CountryPayload } from '../locations.models';
import { CountryService } from './country.service';

@Component({
  selector: 'app-country-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    ToggleSwitchModule,
    InputTextModule,
    FormLayoutComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './country-form.component.html',
})
export class CountryFormComponent implements OnInit {
  private readonly api = inject(CountryService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  /** Page (/new, /:id/edit) or dialog opened from the list. */
  private readonly ctx = injectFormContext(['/locations/countries']);
  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    // The backend wants upper case; lower case is accepted here and converted on save.
    iso_code: ['', [Validators.required, Validators.pattern(/^[A-Za-z]{2}$/)]],
    phone_code: ['', [Validators.required, Validators.pattern(/^\+\d{1,4}$/)]],
    is_active: [true],
  });

  ngOnInit(): void {
    if (this.id !== null) {
      this.loadCountry(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: CountryPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      iso_code: value.iso_code.toUpperCase(),
      phone_code: value.phone_code,
      is_active: value.is_active,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack(true);
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(saved = false): void {
    this.ctx.close(saved);
  }

  private loadCountry(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (country) => {
        this.form.patchValue({
          name_en: country.name_en,
          name_ar: country.name_ar ?? '',
          iso_code: country.iso_code,
          phone_code: country.phone_code,
          is_active: country.is_active,
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    this.formErrors.set(handleSaveError(this.form, error, this.notifications));
  }
}
