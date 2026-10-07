import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { map } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { Named, localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { NamedRef, SelectOption } from '../../company/company.models';
import { CityService } from '../cities/city.service';
import { CountryService } from '../countries/country.service';
import { DistrictService } from '../districts/district.service';
import { LocationService } from '../location.service';
import { City, District, LOCATION_TYPES, LocationPayload, LocationType, Region } from '../locations.models';
import { RegionService } from '../regions/region.service';

/** A company location ("site"): an address under Country → Region → City → District. */
@Component({
  selector: 'app-site-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputSwitchModule,
    InputTextModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-form.component.html',
})
export class SiteFormComponent implements OnInit {
  private readonly api = inject(LocationService);
  private readonly countriesApi = inject(CountryService);
  private readonly regionsApi = inject(RegionService);
  private readonly citiesApi = inject(CityService);
  private readonly districtsApi = inject(DistrictService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly countries = signal<NamedRef[]>([]);
  private readonly regions = signal<Region[]>([]);
  private readonly cities = signal<City[]>([]);
  private readonly districts = signal<District[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  /** Labels are translation keys; the template translates them. */
  readonly typeOptions = LOCATION_TYPES.map((type) => ({ value: type, label: `locations.types.${type}` }));

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    code: ['', [Validators.minLength(3), Validators.maxLength(10)]],
    location_type: ['office' as LocationType, [Validators.required]],
    country: [null as number | null, [Validators.required]],
    region: [null as number | null, [Validators.required]],
    city: [null as number | null, [Validators.required]],
    district: [null as number | null],
    address_line1: ['', [Validators.required, Validators.maxLength(200)]],
    address_line2: ['', [Validators.maxLength(200)]],
    postal_code: ['', [Validators.maxLength(20)]],
    is_active: [true],
  });

  private readonly selection = toSignal(this.form.valueChanges.pipe(map(() => this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });

  // The backend can't filter by parent, so each picker only offers the children of the picker above it.
  readonly countryOptions = computed(() => this.toOptions(this.countries()));
  readonly regionOptions = computed(() =>
    this.toOptions(this.regions().filter((r) => r.country?.id === this.selection().country)),
  );
  readonly cityOptions = computed(() =>
    this.toOptions(this.cities().filter((c) => c.region?.id === this.selection().region)),
  );
  readonly districtOptions = computed(() =>
    this.toOptions(this.districts().filter((d) => d.city?.id === this.selection().city)),
  );

  ngOnInit(): void {
    this.countriesApi.dropdown<NamedRef>().subscribe({
      next: (items) => this.countries.set(items),
      error: () => this.countries.set([]),
    });
    this.regionsApi.listAll().subscribe({
      next: (items) => this.regions.set(items),
      error: () => this.regions.set([]),
    });
    this.citiesApi.listAll().subscribe({
      next: (items) => this.cities.set(items),
      error: () => this.cities.set([]),
    });
    this.districtsApi.listAll().subscribe({
      next: (items) => this.districts.set(items),
      error: () => this.districts.set([]),
    });
    if (this.id !== null) {
      this.loadLocation(this.id);
    }
  }

  // Called from the dropdowns' (onChange), which only fires on user input, so loading a record never clears it.
  onCountryChange(): void {
    this.form.patchValue({ region: null, city: null, district: null });
  }

  onRegionChange(): void {
    this.form.patchValue({ city: null, district: null });
  }

  onCityChange(): void {
    this.form.patchValue({ district: null });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    // Always the full body: a PATCH without country and region fails on older backends (API known issue #5).
    const body: LocationPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      code: value.code.trim() || null,
      location_type: value.location_type,
      country: value.country as number,
      region: value.region as number,
      city: value.city as number,
      district: value.district,
      address_line1: value.address_line1.trim(),
      address_line2: value.address_line2.trim(),
      postal_code: value.postal_code.trim() || null,
      is_active: value.is_active,
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
    void this.router.navigate(['/locations/sites']);
  }

  private toOptions(items: Array<Named & { id: number }>): SelectOption[] {
    return items.map((item) => ({ value: item.id, label: localizedName(item, this.lang()) }));
  }

  private loadLocation(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (location) => {
        this.form.patchValue({
          name_en: location.name_en,
          name_ar: location.name_ar ?? '',
          code: location.code ?? '',
          location_type: location.location_type,
          country: location.country?.id ?? null,
          region: location.region?.id ?? null,
          city: location.city?.id ?? null,
          district: location.district?.id ?? null,
          address_line1: location.address_line1,
          address_line2: location.address_line2 ?? '',
          postal_code: location.postal_code ?? '',
          is_active: location.is_active,
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
