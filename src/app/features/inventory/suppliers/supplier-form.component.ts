import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { SUPPLIER_TYPES, SupplierPayload, SupplierType } from '../inventory.models';
import { SupplierService } from './supplier.service';

@Component({
  selector: 'app-supplier-form',
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
  templateUrl: './supplier-form.component.html',
})
export class SupplierFormComponent implements OnInit {
  private readonly api = inject(SupplierService);
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
  /** Labels are translation keys; the template translates them. */
  readonly typeOptions = SUPPLIER_TYPES.map((type) => ({ value: type, label: `inventory.supplierTypes.${type}` }));

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    supplier_type: ['distributor' as SupplierType, [Validators.required]],
    tax_id: ['', [Validators.maxLength(50)]],
    contact_person: ['', [Validators.maxLength(200)]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.maxLength(50)]],
    mobile: ['', [Validators.maxLength(50)]],
    website: ['', [Validators.maxLength(200), Validators.pattern(/^https?:\/\/\S+$/i)]],
    address_line1: ['', [Validators.maxLength(200)]],
    address_line2: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.maxLength(100)]],
    state: ['', [Validators.maxLength(100)]],
    postal_code: ['', [Validators.maxLength(20)]],
    country: ['', [Validators.maxLength(100)]],
    payment_terms: ['', [Validators.maxLength(100)]],
    currency: ['', [Validators.pattern(/^[A-Za-z]{3}$/)]],
    credit_limit: ['', [Validators.pattern(/^\d+(\.\d{1,2})?$/)]],
    lead_time_days: ['', [Validators.pattern(/^\d+$/)]],
    // 0 to 1 (the backend validates it), not a 5-star rating.
    reliability_score: ['', [Validators.pattern(/^(0(\.\d+)?|1(\.0+)?|\.\d+)$/)]],
    is_preferred: [false],
    is_active: [true],
    notes: [''],
  });

  ngOnInit(): void {
    if (this.id !== null) {
      this.loadSupplier(this.id);
    } else {
      // The backend's defaults; the currency can't be blank.
      this.form.patchValue({ currency: 'USD', lead_time_days: '0', reliability_score: '0' });
      this.form.controls.currency.addValidators(Validators.required);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: SupplierPayload = {
      name: value.name.trim(),
      supplier_type: value.supplier_type,
      tax_id: value.tax_id.trim(),
      contact_person: value.contact_person.trim(),
      email: value.email.trim(),
      phone: value.phone.trim(),
      mobile: value.mobile.trim(),
      website: value.website.trim(),
      address_line1: value.address_line1.trim(),
      address_line2: value.address_line2.trim(),
      city: value.city.trim(),
      state: value.state.trim(),
      postal_code: value.postal_code.trim(),
      country: value.country.trim(),
      payment_terms: value.payment_terms.trim(),
      currency: value.currency.trim().toUpperCase(),
      credit_limit: value.credit_limit.trim() || null,
      // The backend rejects null for these two; empty means 0, its default.
      lead_time_days: Number(value.lead_time_days.trim() || 0),
      reliability_score: Number(value.reliability_score.trim() || 0),
      is_preferred: value.is_preferred,
      is_active: value.is_active,
      notes: value.notes.trim(),
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
    void this.router.navigate(['/inventory/suppliers']);
  }

  private loadSupplier(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (record) => {
        this.form.patchValue({
          name: record.name,
          supplier_type: record.supplier_type,
          tax_id: record.tax_id,
          contact_person: record.contact_person,
          email: record.email,
          phone: record.phone,
          mobile: record.mobile,
          website: record.website,
          address_line1: record.address_line1,
          address_line2: record.address_line2,
          city: record.city,
          state: record.state,
          postal_code: record.postal_code,
          country: record.country,
          payment_terms: record.payment_terms,
          currency: record.currency,
          credit_limit: record.credit_limit ?? '',
          lead_time_days: String(record.lead_time_days ?? 0),
          reliability_score: String(record.reliability_score ?? 0),
          is_preferred: record.is_preferred,
          is_active: record.is_active,
          notes: record.notes,
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
