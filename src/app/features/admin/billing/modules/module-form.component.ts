import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
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
import { BillingModulePayload, MONEY } from '../platform-billing.models';
import { BillingModuleService } from '../platform-billing.service';

/** Module codes are what the app checks (`/me.modules`), e.g. `inventory`: lowercase, digits and underscores. */
const CODE = /^[a-z][a-z0-9_]*$/;

/** Create / edit a catalog module (dialog from the modules list, or /admin/modules/new as a page). */
@Component({
  selector: 'app-module-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    ToggleSwitchModule,
    FormLayoutComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './module-form.component.html',
})
export class ModuleFormComponent implements OnInit {
  private readonly api = inject(BillingModuleService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly ctx = injectFormContext(['/admin/billing/modules']);

  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    code: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(CODE)]],
    price_per_user: ['0.00', [Validators.required, Validators.pattern(MONEY)]],
    icon: ['', [Validators.maxLength(50)]],
    is_active: [true],
    description: [''],
  });

  ngOnInit(): void {
    if (this.id === null) {
      return;
    }
    this.loading.set(true);
    this.api.retrieve(this.id).subscribe({
      next: (module) => {
        this.form.patchValue({
          name: module.name,
          code: module.code,
          price_per_user: module.price_per_user,
          icon: module.icon ?? '',
          is_active: module.is_active,
          description: module.description ?? '',
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
    const body: BillingModulePayload = {
      name: value.name.trim(),
      code: value.code.trim(),
      price_per_user: value.price_per_user,
      icon: value.icon.trim(),
      is_active: value.is_active,
      description: value.description.trim(),
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
