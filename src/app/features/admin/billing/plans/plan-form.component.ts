import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../../core/errors/app-error';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { FormLayoutComponent } from '../../../../shared/components/form-layout/form-layout.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { injectFormContext } from '../../../../shared/forms/form-context';
import { errorTitleKey, handleSaveError } from '../../../../shared/utils/server-errors';
import { BILLING_PERIODS, BillingPeriod, MONEY, PlanPayload, WHOLE } from '../platform-billing.models';
import { PlanService } from '../platform-billing.service';

/** Create / edit a plan (dialog from the plans list, or /admin/plans/new as a page). */
@Component({
  selector: 'app-plan-form',
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
  templateUrl: './plan-form.component.html',
})
export class PlanFormComponent implements OnInit {
  private readonly api = inject(PlanService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly ctx = injectFormContext(['/admin/billing/plans']);

  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly periodOptions = BILLING_PERIODS.map((period) => ({ value: period, label: `admin.billing.periods.${period}` }));

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    billing_period: ['monthly' as BillingPeriod],
    base_price: ['', [Validators.required, Validators.pattern(MONEY)]],
    max_users: ['', [Validators.pattern(WHOLE)]],
    trial_days: ['14', [Validators.pattern(WHOLE)]],
    is_featured: [false],
  });

  ngOnInit(): void {
    if (this.id === null) {
      return;
    }
    this.loading.set(true);
    this.api.retrieve(this.id).subscribe({
      next: (plan) => {
        this.form.patchValue({
          name: plan.name,
          description: plan.description ?? '',
          billing_period: plan.billing_period,
          base_price: plan.base_price,
          max_users: plan.max_users === null ? '' : String(plan.max_users),
          trial_days: String(plan.trial_days ?? 0),
          is_featured: plan.is_featured,
        });
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
    const body: PlanPayload = {
      name: value.name.trim(),
      description: value.description.trim(),
      billing_period: value.billing_period,
      base_price: value.base_price,
      max_users: value.max_users === '' ? null : Number(value.max_users),
      trial_days: value.trial_days === '' ? 0 : Number(value.trial_days),
      is_featured: value.is_featured,
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
