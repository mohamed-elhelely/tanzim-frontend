import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { InputTextModule } from 'primeng/inputtext';
import { MultiSelectModule } from 'primeng/multiselect';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { NamedRef, RolePayload, SelectOption } from '../company.models';
import { PermissionGroupService } from '../permission-groups/permission-group.service';
import { PermissionPickerComponent } from '../permissions/permission-picker.component';
import { RoleService } from './role.service';

@Component({
  selector: 'app-role-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    ToggleSwitchModule,
    InputTextModule,
    MultiSelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
    PermissionPickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './role-form.component.html',
})
export class RoleFormComponent implements OnInit {
  private readonly api = inject(RoleService);
  private readonly groupsApi = inject(PermissionGroupService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly groups = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly groupOptions = computed<SelectOption[]>(() =>
    this.groups().map((g) => ({ value: g.id, label: localizedName(g, this.lang()) })),
  );
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    // A role grants groups and/or single permissions; either may be empty.
    permission_groups: [[] as number[]],
    permissions: [[] as number[]],
    is_admin: [false],
  });

  ngOnInit(): void {
    this.groupsApi.dropdown<NamedRef>().subscribe({
      next: (items) => this.groups.set(items),
      error: () => this.groups.set([]),
    });
    if (this.id !== null) {
      this.loadRole(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: RolePayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      permission_groups: value.permission_groups,
      permissions: value.permissions,
      is_admin: value.is_admin,
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
    void this.router.navigate(['/company/roles']);
  }

  private loadRole(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (role) => {
        this.form.patchValue({
          name_en: role.name_en,
          name_ar: role.name_ar ?? '',
          permission_groups: (role.permission_groups ?? []).map((g) => g.id),
          permissions: (role.permissions ?? []).map((p) => p.id),
          is_admin: role.is_admin,
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
