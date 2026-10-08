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
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { TenantCompanyPayload } from '../admin.models';
import { TenantCompanyService } from './tenant-company.service';

const DEFAULT_TIMEZONE = 'Asia/Riyadh';

/** IANA zones known to the browser, plus UTC (some browsers leave it out). */
function timezoneNames(): string[] {
  const names = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : [DEFAULT_TIMEZONE];
  return names.includes('UTC') ? names : ['UTC', ...names];
}

@Component({
  selector: 'app-tenant-company-form',
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
  templateUrl: './tenant-company-form.component.html',
})
export class TenantCompanyFormComponent implements OnInit {
  private readonly api = inject(TenantCompanyService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  /** The saved zone, kept in the options even if this browser doesn't know it. */
  private readonly savedTimezone = signal<string | null>(null);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly timezoneOptions = computed(() => {
    const names = timezoneNames();
    const saved = this.savedTimezone();
    return saved && !names.includes(saved) ? [saved, ...names] : names;
  });
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    legal_name: ['', [Validators.maxLength(255)]],
    // Same rule as the backend; upper case is accepted here and lowered on save.
    domain: ['', [Validators.required, Validators.maxLength(255), Validators.pattern(/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/)]],
    tax_id: ['', [Validators.maxLength(100), Validators.pattern(/^[A-Za-z0-9-]*$/)]],
    // On create the backend emails the first admin's login details to this address, so it is required then.
    email: ['', [Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.pattern(/^\+\d{8,15}$/)]],
    address: [''],
    timezone: [DEFAULT_TIMEZONE, [Validators.required]],
    primary_color: ['#4f46e5'],
    secondary_color: ['#ffffff'],
    is_active: [true],
  });

  ngOnInit(): void {
    if (this.id !== null) {
      this.loadCompany(this.id);
    } else {
      this.form.controls.email.addValidators(Validators.required);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: TenantCompanyPayload = {
      name: value.name.trim(),
      legal_name: value.legal_name.trim(),
      domain: value.domain.trim().toLowerCase(),
      tax_id: value.tax_id.trim(),
      email: value.email.trim(),
      address: value.address.trim(),
      timezone: value.timezone,
      primary_color: value.primary_color,
      secondary_color: value.secondary_color,
      is_active: value.is_active,
    };
    if (value.phone.trim()) {
      body.phone = value.phone.trim();
    }
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(
          this.isEdit
            ? this.translate.instant('common.saved')
            : this.translate.instant('admin.companies.created', { email: body.email }),
        );
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/admin/companies']);
  }

  private loadCompany(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (company) => {
        this.savedTimezone.set(company.timezone);
        this.form.patchValue({
          name: company.name,
          legal_name: company.legal_name,
          domain: company.domain,
          tax_id: company.tax_id,
          email: company.email,
          phone: company.phone ?? '',
          address: company.address,
          timezone: company.timezone,
          primary_color: company.primary_color,
          secondary_color: company.secondary_color,
          is_active: company.is_active,
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
