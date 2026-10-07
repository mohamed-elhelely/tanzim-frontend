import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { SelectOption } from '../../company/company.models';
import { CityPayload, Region } from '../locations.models';
import { RegionService } from '../regions/region.service';
import { CityService } from './city.service';

/** UTC and GMT first (the only values older backends accept), then the IANA zones known to the browser. */
const TIMEZONE_OPTIONS: Array<{ value: string; label: string }> = [
  'UTC',
  'GMT',
  ...Intl.supportedValuesOf('timeZone').filter((zone) => zone !== 'UTC' && zone !== 'GMT'),
].map((zone) => ({ value: zone, label: zone }));

@Component({
    selector: 'app-city-form',
    imports: [
        ReactiveFormsModule,
        TranslatePipe,
        ButtonModule,
        CardModule,
        DropdownModule,
        InputTextModule,
        PageHeaderComponent,
        LoadingStateComponent,
        ErrorStateComponent,
        FieldErrorComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './city-form.component.html'
})
export class CityFormComponent implements OnInit {
  private readonly api = inject(CityService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly regionsApi = inject(RegionService);
  private readonly regions = signal<Region[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
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
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/locations/cities']);
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
    if (error.status === 0 || error.status === 401 || error.status >= 500) {
      return; // already shown by the global error handling
    }
    this.formErrors.set(applyServerErrors(this.form, error));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
