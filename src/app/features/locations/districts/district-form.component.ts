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
import { CityService } from '../cities/city.service';
import { City, DistrictPayload } from '../locations.models';
import { DistrictService } from './district.service';

@Component({
    selector: 'app-district-form',
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
    templateUrl: './district-form.component.html'
})
export class DistrictFormComponent implements OnInit {
  private readonly api = inject(DistrictService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly citiesApi = inject(CityService);
  private readonly cities = signal<City[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;

  /** "City — Region", because city names repeat across regions. */
  readonly cityOptions = computed<SelectOption[]>(() =>
    this.cities().map((c) => ({
      value: c.id,
      label: `${localizedName(c, this.lang())} — ${localizedName(c.region, this.lang())}`,
    })),
  );

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    city: [null as number | null, [Validators.required]],
    postal_code_prefix: ['', [Validators.pattern(/^\d{3,5}$/)]],
  });

  ngOnInit(): void {
    this.citiesApi.listAll().subscribe({
      next: (items) => this.cities.set(items),
      error: () => this.cities.set([]),
    });
    if (this.id !== null) {
      this.loadDistrict(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: DistrictPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      city: value.city as number,
      postal_code_prefix: value.postal_code_prefix.trim() || null,
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
    void this.router.navigate(['/locations/districts']);
  }

  private loadDistrict(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (district) => {
        this.form.patchValue({
          name_en: district.name_en,
          name_ar: district.name_ar ?? '',
          city: district.city?.id ?? null,
          postal_code_prefix: district.postal_code_prefix ?? '',
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
