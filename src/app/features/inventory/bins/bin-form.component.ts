import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { FormLayoutComponent } from '../../../shared/components/form-layout/form-layout.component';
import { injectFormContext } from '../../../shared/forms/form-context';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { SelectOption } from '../../company/company.models';
import { BinPayload, Zone } from '../inventory.models';
import { trimZeros } from '../variants/variant-options';
import { ZoneService } from '../zones/zone.service';
import { BinService } from './bin.service';

@Component({
  selector: 'app-bin-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    FormLayoutComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bin-form.component.html',
})
export class BinFormComponent implements OnInit {
  private readonly api = inject(BinService);
  private readonly zonesApi = inject(ZoneService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  /** Page (/new, /:id/edit) or dialog opened from the list. */
  private readonly ctx = injectFormContext(['/inventory/bins']);
  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  private readonly zones = signal<Zone[]>([]);
  /** "Main warehouse › Zone A": zone names repeat across warehouses (full list, since the dropdown has no warehouse). */
  readonly zoneOptions = computed<SelectOption[]>(() =>
    this.zones().map((zone) => ({ value: zone.id, label: `${zone.warehouse?.name ?? ''} › ${zone.name}` })),
  );

  readonly form = inject(NonNullableFormBuilder).group({
    zone: [null as number | null, [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.maxLength(20)]],
    barcode: ['', [Validators.maxLength(100)]],
    // Up to 3 decimals, like the backend's DecimalField.
    max_capacity: ['', [Validators.pattern(/^\d+(\.\d{1,3})?$/)]],
    bin_type: ['', [Validators.maxLength(20)]],
    is_active: [true],
    allow_mixed_products: [false],
  });

  ngOnInit(): void {
    this.zonesApi.listAll().subscribe({
      next: (items) => this.zones.set(items),
      error: () => this.zones.set([]),
    });
    if (this.id !== null) {
      this.loadBin(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const capacity = value.max_capacity.trim();
    const payload: BinPayload = {
      zone: value.zone,
      name: value.name.trim(),
      code: value.code.trim(),
      barcode: value.barcode.trim(),
      max_capacity: capacity || null,
      bin_type: value.bin_type.trim(),
      is_active: value.is_active,
      allow_mixed_products: value.allow_mixed_products,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, payload) : this.api.create(payload);
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

  private loadBin(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (record) => {
        this.form.patchValue({
          zone: record.zone?.id ?? null,
          name: record.name,
          code: record.code,
          barcode: record.barcode,
          max_capacity: trimZeros(record.max_capacity),
          bin_type: record.bin_type,
          is_active: record.is_active,
          allow_mixed_products: record.allow_mixed_products,
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
