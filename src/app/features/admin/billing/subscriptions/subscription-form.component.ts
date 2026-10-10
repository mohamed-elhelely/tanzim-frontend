import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../../core/errors/app-error';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { FormLayoutComponent } from '../../../../shared/components/form-layout/form-layout.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { injectFormContext } from '../../../../shared/forms/form-context';
import { errorTitleKey, handleSaveError } from '../../../../shared/utils/server-errors';
import { SubscriptionStatus } from '../../../billing/billing.models';
import { TenantCompanyService } from '../../companies/tenant-company.service';
import { SUBSCRIPTION_STATUSES, SubscriptionPayload, WHOLE } from '../platform-billing.models';
import { PlanService, SubscriptionService } from '../platform-billing.service';

/** `YYYY-MM-DD`, `months` from today. */
function isoDate(months = 0): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

/** Create / edit a company's subscription (dialog from the subscriptions list). */
@Component({
  selector: 'app-subscription-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
    FormLayoutComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-form.component.html',
})
export class SubscriptionFormComponent implements OnInit {
  private readonly api = inject(SubscriptionService);
  private readonly companies = inject(TenantCompanyService);
  private readonly plans = inject(PlanService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly ctx = injectFormContext(['/admin/billing/subscriptions']);

  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly companyOptions = signal<Array<{ value: number; label: string }>>([]);
  readonly planOptions = signal<Array<{ value: number; label: string }>>([]);
  readonly statusOptions = SUBSCRIPTION_STATUSES.map((status) => ({ value: status, label: `billing.subscriptionStatus.${status}` }));

  readonly form = inject(NonNullableFormBuilder).group({
    company: [null as number | null, [Validators.required]],
    plan: [null as number | null, [Validators.required]],
    status: ['trial' as SubscriptionStatus],
    billing_email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    start_date: [isoDate(), [Validators.required]],
    end_date: [isoDate(12), [Validators.required]],
    trial_end_date: [''],
    next_billing_date: [isoDate(1), [Validators.required]],
    licensed_users: ['1', [Validators.required, Validators.pattern(WHOLE)]],
    auto_renew: [true],
  });

  ngOnInit(): void {
    this.companies.all().subscribe({
      next: (items) => this.companyOptions.set(items.map((company) => ({ value: company.id, label: company.name }))),
      error: () => this.companyOptions.set([]),
    });
    this.plans.all().subscribe({
      next: (items) => this.planOptions.set(items.map((plan) => ({ value: plan.id, label: plan.name }))),
      error: () => this.planOptions.set([]),
    });
    if (this.id === null) {
      return;
    }
    this.loading.set(true);
    this.api.retrieve(this.id).subscribe({
      next: (subscription) => {
        this.form.patchValue({
          company: subscription.company,
          plan: subscription.plan,
          status: subscription.status,
          billing_email: subscription.billing_email,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          trial_end_date: subscription.trial_end_date ?? '',
          next_billing_date: subscription.next_billing_date,
          licensed_users: String(subscription.licensed_users),
          auto_renew: subscription.auto_renew,
        });
        // A subscription stays with its company.
        this.form.controls.company.disable();
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: SubscriptionPayload = {
      company: value.company as number,
      plan: value.plan as number,
      status: value.status,
      billing_email: value.billing_email.trim(),
      start_date: value.start_date,
      end_date: value.end_date,
      trial_end_date: value.trial_end_date || null,
      next_billing_date: value.next_billing_date,
      licensed_users: Number(value.licensed_users),
      auto_renew: value.auto_renew,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack(true);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(saved = false): void {
    this.ctx.close(saved);
  }
}
