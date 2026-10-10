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
import { SelectOption } from '../../company/company.models';
import { CityPayload, Region } from '../locations.models';
import { RegionService } from '../regions/region.service';
import { CityService } from './city.service';

/** UTC, then the IANA zones known to the browser (some browsers leave UTC out of the list). */
const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  'UTC',
  ...Intl.supportedValuesOf('timeZone').filter((zone) => zone !== 'UTC'),
].map((zone) => ({ value: zone, label: zone }));

@Component({
  selector: 'app-city-form',
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
  templateUrl: './city-form.component.html',
})
export class CityFormComponent implements OnInit {
  private readonly api = inject(CityService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly regionsApi = inject(RegionService);
  private readonly regions = signal<Region[]>([]);

  /** Page (/new, /:id/edit) or dialog opened from the list. */
  private readonly ctx = injectFormContext(['/locations/cities']);
  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;

  /** "Region — Country", because region names repeat across countries. */
  readonly regionOptions = computed<SelectOption[]>(() =>
    this.regions().map((r) => ({
      value: r.id,
      label: `${localizedName(r, this.lang())} — ${localizedName(r.country, this.lang())}`,
    })),
  );
  readonly timezoneOptions = TIMEZONE_OPTIONS;

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    region: [null as number | null, [Validators.required]],
    timezone: ['UTC', [Validators.required]],
  });

  ngOnInit(): void {
    this.regionsApi.listAll().subscribe({
      next: (items) => this.regions.set(items),
      error: () => this.regions.set([]),
    });
    if (this.id !== null) {
      this.loadCity(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: CityPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      region: value.region as number,
      timezone: value.timezone,
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

  private loadCity(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (city) => {
        this.form.patchValue({
          name_en: city.name_en,
          name_ar: city.name_ar ?? '',
          region: city.region?.id ?? null,
          timezone: city.timezone,
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
