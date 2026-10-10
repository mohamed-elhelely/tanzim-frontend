import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { PermissionGroupPayload } from '../company.models';
import { PermissionPickerComponent } from '../permissions/permission-picker.component';
import { PermissionGroupService } from './permission-group.service';

@Component({
  selector: 'app-permission-group-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
    PermissionPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-group-form.component.html',
})
export class PermissionGroupFormComponent implements OnInit {
  private readonly api = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  /** System groups (Full Access, Read Only…) are shown read-only: the backend refuses changes with 403. */
  readonly isCore = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    description: [''],
    permissions: [[] as number[]],
  });

  ngOnInit(): void {
    if (this.id !== null) {
      this.loadGroup(this.id);
    }
  }

  submit(): void {
    if (this.isCore()) {
      return;
    }
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: PermissionGroupPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      description: value.description.trim(),
      permissions: value.permissions,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
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
    void this.router.navigate(['/company/permission-groups']);
  }

  private loadGroup(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (group) => {
        this.form.patchValue({
          name_en: group.name_en,
          name_ar: group.name_ar ?? '',
          description: group.description ?? '',
          permissions: (group.permissions ?? []).map((p) => p.id),
        });
        if (group.is_core) {
          this.isCore.set(true);
          this.form.disable();
        }
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
