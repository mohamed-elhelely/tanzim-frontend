import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { NamedRef, SelectOption } from '../../company/company.models';
import { CompanyUserService } from '../../company/users/company-user.service';
import { LocationService } from '../../locations/sites/location.service';
import { WAREHOUSE_TYPES, WarehousePayload, WarehouseType } from '../inventory.models';
import { WarehouseService } from './warehouse.service';

@Component({
  selector: 'app-warehouse-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './warehouse-form.component.html',
})
export class WarehouseFormComponent implements OnInit {
  private readonly api = inject(WarehouseService);
  private readonly locationsApi = inject(LocationService);
  private readonly users = inject(CompanyUserService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly locations = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly userOptions = signal<SelectOption[]>([]);
  readonly locationOptions = computed<SelectOption[]>(() =>
    this.locations().map((location) => ({ value: location.id, label: localizedName(location, this.lang()) })),
  );
  /** Labels are translation keys; the template translates them. */
  readonly typeOptions = WAREHOUSE_TYPES.map((type) => ({ value: type, label: `inventory.warehouseTypes.${type}` }));

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.maxLength(20)]],
    warehouse_type: ['central' as WarehouseType, [Validators.required]],
    location: [null as number | null],
    manager: [null as number | null],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.maxLength(50)]],
    address_line1: ['', [Validators.maxLength(200)]],
    address_line2: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.maxLength(100)]],
    state: ['', [Validators.maxLength(100)]],
    postal_code: ['', [Validators.maxLength(20)]],
    country: ['', [Validators.maxLength(100)]],
    is_active: [true],
    allow_negative_stock: [false],
    use_bin_locations: [false],
  });

  ngOnInit(): void {
    this.locationsApi.dropdown<NamedRef>().subscribe({
      next: (items) => this.locations.set(items),
      error: () => this.locations.set([]),
    });
    this.users.userOptions().subscribe({
      next: (options) => this.userOptions.set(options),
      error: () => this.userOptions.set([]),
    });
    if (this.id !== null) {
      this.loadWarehouse(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: WarehousePayload = {
      name: value.name.trim(),
      code: value.code.trim(),
      warehouse_type: value.warehouse_type,
      location: value.location,
      manager: value.manager,
      email: value.email.trim(),
      phone: value.phone.trim(),
      address_line1: value.address_line1.trim(),
      address_line2: value.address_line2.trim(),
      city: value.city.trim(),
      state: value.state.trim(),
      postal_code: value.postal_code.trim(),
      country: value.country.trim(),
      is_active: value.is_active,
      allow_negative_stock: value.allow_negative_stock,
      use_bin_locations: value.use_bin_locations,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, payload) : this.api.create(payload);
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
    void this.router.navigate(['/inventory/warehouses']);
  }

  private loadWarehouse(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (warehouse) => {
        this.form.patchValue({
          name: warehouse.name,
          code: warehouse.code,
          warehouse_type: warehouse.warehouse_type,
          location: warehouse.location?.id ?? null,
          manager: warehouse.manager?.id ?? null,
          email: warehouse.email,
          phone: warehouse.phone,
          address_line1: warehouse.address_line1,
          address_line2: warehouse.address_line2,
          city: warehouse.city,
          state: warehouse.state,
          postal_code: warehouse.postal_code,
          country: warehouse.country,
          is_active: warehouse.is_active,
          allow_negative_stock: warehouse.allow_negative_stock,
          use_bin_locations: warehouse.use_bin_locations,
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
