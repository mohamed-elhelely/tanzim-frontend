import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { forkJoin } from 'rxjs';
import { AppError } from '../../core/errors/app-error';
import { LanguageService } from '../../core/services/language.service';
import { NotificationService } from '../../core/services/notification.service';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { localizedName } from '../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../shared/utils/server-errors';
import { SelectOption } from '../company/company.models';
import { CityService, CountryService, DistrictService, RegionService } from './geo.services';
import { City, Country, District, LOCATION_TYPES, Location, LocationPayload, LocationType, Region } from './location.models';
import { LocationService } from './location.service';

export type GeoState = 'loading' | 'ready' | 'forbidden' | 'empty' | 'error';

interface Identified {
  id: number;
}

/**
 * `list` plus the `extra` items it doesn't have. Keeps a saved location's country/region/city/district
 * selectable even when it falls outside the first page the pickers load, whichever response arrives first.
 */
function mergeById<T extends Identified>(list: T[], extra: Array<T | null>): T[] {
  const missing = extra.filter((item): item is T => !!item && !list.some((existing) => existing.id === item.id));
  return missing.length ? [...list, ...missing] : list;
}

@Component({
  selector: 'app-location-form',
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
  templateUrl: './location-form.component.html',
})
export class LocationFormComponent implements OnInit {
  private readonly api = inject(LocationService);
  private readonly countriesApi = inject(CountryService);
  private readonly regionsApi = inject(RegionService);
  private readonly citiesApi = inject(CityService);
  private readonly districtsApi = inject(DistrictService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;

  private readonly countries = signal<Country[]>([]);
  private readonly regions = signal<Region[]>([]);
  private readonly cities = signal<City[]>([]);
  private readonly districts = signal<District[]>([]);
  private readonly selectedCountry = signal<number | null>(null);
  private readonly selectedRegion = signal<number | null>(null);
  private readonly selectedCity = signal<number | null>(null);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly geoState = signal<GeoState>('loading');
  readonly canSave = computed(() => this.geoState() === 'ready');
  readonly errorTitleKey = errorTitleKey;

  readonly typeOptions = computed(() => {
    this.lang(); // re-translate on language switch
    return LOCATION_TYPES.map((type) => ({ value: type, label: this.translate.instant(`locations.types.${type}`) }));
  });
  readonly countryOptions = computed(() => this.toOptions(this.countries()));
  readonly regionOptions = computed(() =>
    this.toOptions(this.regions().filter((r) => r.country?.id === this.selectedCountry())),
  );
  readonly cityOptions = computed(() =>
    this.toOptions(this.cities().filter((c) => c.region?.id === this.selectedRegion())),
  );
  readonly districtOptions = computed(() =>
    this.toOptions(this.districts().filter((d) => d.city?.id === this.selectedCity())),
  );

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

  constructor() {
    // Picking a parent clears the levels below it, since they belong to the old parent.
    const { country, region, city, district } = this.form.controls;
    country.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedCountry.set(value);
      region.setValue(null);
    });
    region.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedRegion.set(value);
      city.setValue(null);
    });
    city.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.selectedCity.set(value);
      district.setValue(null);
    });
  }

  ngOnInit(): void {
    forkJoin([
      this.countriesApi.options(),
      this.regionsApi.options(),
      this.citiesApi.options(),
      this.districtsApi.options(),
    ]).subscribe({
      next: ([countries, regions, cities, districts]) => {
        this.countries.update((list) => mergeById(countries, list));
        this.regions.update((list) => mergeById(regions, list));
        this.cities.update((list) => mergeById(cities, list));
        this.districts.update((list) => mergeById(districts, list));
        this.geoState.set(countries.length ? 'ready' : 'empty');
      },
      error: (error: AppError) => this.geoState.set(error.status === 403 ? 'forbidden' : 'error'),
    });
    if (this.id !== null) {
      this.loadLocation(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving() || !this.canSave()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
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
    void this.router.navigate(['/locations']);
  }

  private loadLocation(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (location) => {
        this.patchLocation(location);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private patchLocation(location: Location): void {
    this.countries.update((list) => mergeById(list, [location.country]));
    this.regions.update((list) => mergeById(list, [location.region]));
    this.cities.update((list) => mergeById(list, [location.city]));
    this.districts.update((list) => mergeById(list, [location.district]));
    // emitEvent: false so the cascade above doesn't clear the saved region/city/district.
    this.form.patchValue(
      {
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
      },
      { emitEvent: false },
    );
    this.selectedCountry.set(location.country?.id ?? null);
    this.selectedRegion.set(location.region?.id ?? null);
    this.selectedCity.set(location.city?.id ?? null);
  }

  private toOptions(items: Array<Identified & { name_en: string; name_ar: string | null }>): SelectOption[] {
    return items.map((item) => ({ value: item.id, label: localizedName(item, this.lang()) }));
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
