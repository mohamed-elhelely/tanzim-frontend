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
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { omitPristine } from '../../../shared/utils/omit-pristine';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { SelectOption } from '../../company/company.models';
import { BinPayload, CodedRef, Zone } from '../inventory.models';
import { ZoneService } from '../zones/zone.service';
import { BinService } from './bin.service';

/** ⚠️ Fields the read endpoint doesn't return: shown empty on edit and only sent when changed (see omitPristine). */
const NOT_RETURNED = [
  'code',
  'barcode',
  'max_capacity',
  'bin_type',
] as const;

@Component({
  selector: 'app-bin-form',
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
  templateUrl: './bin-form.component.html',
})
export class BinFormComponent implements OnInit {
  private readonly api = inject(BinService);
  private readonly zonesApi = inject(ZoneService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
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
    const body = omitPristine(payload, this.form, NOT_RETURNED);
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(payload);
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
    void this.router.navigate(['/inventory/bins']);
  }

  private loadBin(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (record) => {
        this.form.patchValue({
          zone: record.zone?.id ?? null,
          name: record.name,
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
    // The code is only returned by the dropdown.
    this.api.dropdown<CodedRef>().subscribe({
      next: (items) => {
        const code = items.find((item) => item.id === id)?.code;
        if (code) {
          this.form.controls.code.setValue(code);
        }
      },
      error: () => undefined, // the code stays empty and, being untouched, isn't sent
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    this.formErrors.set(handleSaveError(this.form, error, this.notifications));
  }
}
