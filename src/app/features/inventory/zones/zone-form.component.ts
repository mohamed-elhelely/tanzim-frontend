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
import { CodedRef, ZonePayload } from '../inventory.models';
import { WarehouseService } from '../warehouses/warehouse.service';
import { ZoneService } from './zone.service';

@Component({
  selector: 'app-zone-form',
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
  templateUrl: './zone-form.component.html',
})
export class ZoneFormComponent implements OnInit {
  private readonly api = inject(ZoneService);
  private readonly warehousesApi = inject(WarehouseService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  /** Page (/new, /:id/edit) or dialog opened from the list. */
  private readonly ctx = injectFormContext(['/inventory/zones']);
  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  private readonly warehouses = signal<CodedRef[]>([]);
  /** "Main warehouse (WH-01)": codes tell same-named warehouses apart. */
  readonly warehouseOptions = computed<SelectOption[]>(() =>
    this.warehouses().map((w) => ({ value: w.id, label: w.code ? `${w.name} (${w.code})` : w.name })),
  );

  readonly form = inject(NonNullableFormBuilder).group({
    warehouse: [null as number | null, [Validators.required]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.maxLength(20)]],
    description: [''],
    is_active: [true],
  });

  ngOnInit(): void {
    this.warehousesApi.dropdown<CodedRef>().subscribe({
      next: (items) => this.warehouses.set(items),
      error: () => this.warehouses.set([]),
    });
    if (this.id !== null) {
      this.loadZone(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: ZonePayload = {
      warehouse: value.warehouse,
      name: value.name.trim(),
      code: value.code.trim(),
      description: value.description.trim(),
      is_active: value.is_active,
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

  private loadZone(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (record) => {
        this.form.patchValue({
          warehouse: record.warehouse?.id ?? null,
          name: record.name,
          code: record.code,
          description: record.description,
          is_active: record.is_active,
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
