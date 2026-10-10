import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { FormLayoutComponent } from '../../../shared/components/form-layout/form-layout.component';
import { injectFormContext } from '../../../shared/forms/form-context';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { NamedRef, SelectOption } from '../../company/company.models';
import { CountryService } from '../countries/country.service';
import { RegionPayload } from '../locations.models';
import { RegionService } from './region.service';

@Component({
  selector: 'app-region-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    SelectModule,
    InputTextModule,
    FormLayoutComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './region-form.component.html',
})
export class RegionFormComponent implements OnInit {
  private readonly api = inject(RegionService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly countries = inject(CountryService);
  private readonly countryRefs = signal<NamedRef[]>([]);

  /** Page (/new, /:id/edit) or dialog opened from the list. */
  private readonly ctx = injectFormContext(['/locations/regions']);
  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly countryOptions = computed<SelectOption[]>(() =>
    this.countryRefs().map((c) => ({ value: c.id, label: localizedName(c, this.lang()) })),
  );

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    country: [null as number | null, [Validators.required]],
    // Optional; the backend wants 2–3 upper-case letters, converted on save.
    code: ['', [Validators.pattern(/^[A-Za-z]{2,3}$/)]],
  });

  ngOnInit(): void {
    this.countries.dropdown<NamedRef>().subscribe({
      next: (items) => this.countryRefs.set(items),
      error: () => this.countryRefs.set([]),
    });
    if (this.id !== null) {
      this.loadRegion(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: RegionPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      code: value.code.toUpperCase(),
      country: value.country as number,
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

  private loadRegion(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (region) => {
        this.form.patchValue({
          name_en: region.name_en,
          name_ar: region.name_ar ?? '',
          country: region.country?.id ?? null,
          code: region.code ?? '',
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
