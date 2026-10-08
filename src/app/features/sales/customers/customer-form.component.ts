import { DecimalPipe } from '@angular/common';
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
import { AddressFieldsComponent, addressGroup, patchAddress, toAddress } from '../address-fields/address-fields.component';
import { CUSTOMER_TYPES, Customer, CustomerPayload, CustomerType } from '../sales.models';
import { CustomerService } from './customer.service';

@Component({
  selector: 'app-customer-form',
  imports: [
    DecimalPipe,
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
    AddressFieldsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customer-form.component.html',
})
export class CustomerFormComponent implements OnInit {
  private readonly api = inject(CustomerService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  /** The saved record on edit: number, credit used and open orders are shown read-only. */
  readonly record = signal<Customer | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly typeOptions = CUSTOMER_TYPES.map((type) => ({ value: type, label: `sales.customerTypes.${type}` }));

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    customer_type: ['business' as CustomerType, [Validators.required]],
    email: ['', [Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.maxLength(50)]],
    mobile: ['', [Validators.maxLength(50)]],
    website: ['', [Validators.maxLength(200), Validators.pattern(/^https?:\/\/\S+$/i)]],
    tax_id: ['', [Validators.maxLength(50)]],
    // Empty means no limit (the backend allows unlimited credit when it's null).
    credit_limit: ['', [Validators.pattern(/^\d+(\.\d{1,4})?$/)]],
    payment_terms: ['', [Validators.maxLength(100)]],
    currency: ['USD', [Validators.required, Validators.pattern(/^[A-Za-z]{3}$/)]],
    billing_address: addressGroup(this.fb),
    shipping_address: addressGroup(this.fb),
    is_active: [true],
    notes: [''],
  });

  ngOnInit(): void {
    if (this.id !== null) {
      this.loadCustomer(this.id);
    }
  }

  /** Copies the billing address into the shipping address. */
  copyBillingToShipping(): void {
    this.form.controls.shipping_address.setValue(this.form.controls.billing_address.getRawValue());
    this.form.controls.shipping_address.markAsDirty();
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: CustomerPayload = {
      name: value.name.trim(),
      customer_type: value.customer_type,
      email: value.email.trim(),
      phone: value.phone.trim(),
      mobile: value.mobile.trim(),
      website: value.website.trim(),
      tax_id: value.tax_id.trim(),
      credit_limit: value.credit_limit.trim() || null,
      payment_terms: value.payment_terms.trim(),
      currency: value.currency.trim().toUpperCase(),
      billing_address: toAddress(this.form.controls.billing_address),
      shipping_address: toAddress(this.form.controls.shipping_address),
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
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/sales/customers']);
  }

  private loadCustomer(id: number): void {
    this.loading.set(true);
    this.api.detail(id).subscribe({
      next: (record) => {
        this.record.set(record);
        this.form.patchValue({
          name: record.name,
          customer_type: record.customer_type,
          email: record.email,
          phone: record.phone,
          mobile: record.mobile,
          website: record.website,
          tax_id: record.tax_id,
          credit_limit: record.credit_limit ?? '',
          payment_terms: record.payment_terms,
          currency: record.currency,
          is_active: record.is_active,
          notes: record.notes,
        });
        patchAddress(this.form.controls.billing_address, record.billing_address);
        patchAddress(this.form.controls.shipping_address, record.shipping_address);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }
}
