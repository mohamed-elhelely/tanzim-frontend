import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { Observable, catchError, forkJoin, map, of, startWith } from 'rxjs';
import { AccessService } from '../../../../core/auth/access.service';
import { AppError } from '../../../../core/errors/app-error';
import { NotificationService } from '../../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { FormLayoutComponent } from '../../../../shared/components/form-layout/form-layout.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { injectFormContext } from '../../../../shared/forms/form-context';
import { handleSaveError } from '../../../../shared/utils/server-errors';
import { SubscriptionStatus } from '../../../billing/billing.models';
import { TenantCompanyService } from '../../companies/tenant-company.service';
import { BillingModule, MODULE_EDITABLE_STATUSES, SUBSCRIPTION_STATUSES, Subscription, SubscriptionPayload, WHOLE } from '../platform-billing.models';
import { BillingModuleService, PlanService, SubscriptionService } from '../platform-billing.service';
import { SubscriptionModulesComponent } from './subscription-modules.component';
import { MultiSelectComponent, SelectItemDirective, ToggleComponent } from '../../../../shared/ui';

/** `YYYY-MM-DD`, `months` from today. */
function isoDate(months = 0): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

/**
 * Create / edit a company's subscription (dialog from the subscriptions list). Editing shows the modules panel;
 * creating lets staff pick modules, added one by one (add_module) once the subscription exists.
 */
@Component({
  selector: 'app-subscription-form',
  imports: [
    SelectItemDirective,
    MultiSelectComponent,
    ToggleComponent,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    SelectModule,
    FormLayoutComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
    SubscriptionModulesComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './subscription-form.component.html',
})
export class SubscriptionFormComponent implements OnInit {
  private readonly api = inject(SubscriptionService);
  private readonly companies = inject(TenantCompanyService);
  private readonly plans = inject(PlanService);
  private readonly modulesApi = inject(BillingModuleService);
  private readonly access = inject(AccessService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly ctx = injectFormContext(['/admin/billing/subscriptions']);

  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly companyOptions = signal<{ value: number; label: string }[]>([]);
  readonly planOptions = signal<{ value: number; label: string }[]>([]);
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
    /** Create only: modules to add once the subscription exists. */
    module_ids: [[] as number[]],
  });

  readonly isStaff = this.access.isStaff;
  /** Edit only: the saved subscription, for the modules panel. */
  readonly subscription = signal<Subscription | null>(null);
  readonly moduleOptions = signal<BillingModule[]>([]);
  private readonly status = toSignal(this.form.controls.status.valueChanges.pipe(startWith(this.form.controls.status.value)));
  /** add_module refuses subscriptions that aren't trial/active. */
  readonly modulesAllowed = computed(() => MODULE_EDITABLE_STATUSES.includes(this.status() ?? 'trial'));
  /** Module changes apply at once, so the list reloads even when the form itself isn't saved. */
  private modulesChanged = false;

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
      if (this.isStaff()) {
        this.modulesApi.all().subscribe({
          next: (modules) => this.moduleOptions.set(modules.filter((module) => module.is_active)),
          error: () => this.moduleOptions.set([]),
        });
      }
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
        this.subscription.set(subscription);
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
    if (this.id !== null) {
      this.api.update(this.id, body).subscribe({
        next: (subscription) => {
          this.saving.set(false);
          this.notifications.success(this.translate.instant('common.saved'));
          this.afterModulesChange(subscription.company ?? body.company);
          this.goBack(true);
        },
        error: (error: AppError) => this.onSaveError(error),
      });
      return;
    }
    const moduleIds = this.modulesAllowed() ? value.module_ids : [];
    this.api.create(body).subscribe({
      next: (subscription) => {
        this.notifications.success(this.translate.instant('common.saved'));
        if (!moduleIds.length) {
          this.saving.set(false);
          this.afterModulesChange(subscription.company ?? body.company);
          this.goBack(true);
          return;
        }
        this.addModules(subscription, moduleIds).subscribe((failures) => {
          this.saving.set(false);
          if (failures.length) {
            this.notifications.error(
              this.translate.instant('admin.billing.subscriptions.modulesFailed', { modules: failures.join('; ') }),
            );
          }
          this.afterModulesChange(subscription.company ?? body.company);
          this.goBack(true);
        });
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  onModulesChanged(subscription: Subscription): void {
    this.subscription.set(subscription);
    this.modulesChanged = true;
  }

  goBack(saved = false): void {
    this.ctx.close(saved || this.modulesChanged);
  }

  /** Adds each module in turn; answers "Name (reason)" for those the backend refused. */
  private addModules(subscription: Subscription, moduleIds: number[]): Observable<string[]> {
    const names = new Map(this.moduleOptions().map((module) => [module.id, module.name]));
    const calls = moduleIds.map((moduleId) =>
      this.api.addModule(subscription.id, moduleId).pipe(
        map(() => null),
        catchError((error: AppError) => of(`${names.get(moduleId) ?? `#${moduleId}`} (${error.message})`)),
      ),
    );
    return forkJoin(calls).pipe(map((results) => results.filter((failure): failure is string => failure !== null)));
  }

  /** The user's own company: fetch /me again so the menu shows its modules without a re-login. */
  private afterModulesChange(company: number): void {
    if (this.access.current()?.company?.id === company) {
      this.access.reload();
    }
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    this.formErrors.set(handleSaveError(this.form, error, this.notifications));
  }
}
