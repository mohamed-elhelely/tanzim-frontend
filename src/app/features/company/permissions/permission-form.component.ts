import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MultiSelectModule } from 'primeng/multiselect';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { NamedRef, PermissionPayload, PermissionType, SelectOption } from '../company.models';
import { PermissionGroupService } from '../permission-groups/permission-group.service';
import { PermissionService } from './permission.service';

@Component({
  selector: 'app-permission-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DropdownModule,
    InputTextModule,
    InputTextareaModule,
    MultiSelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './permission-form.component.html',
})
export class PermissionFormComponent implements OnInit {
  private readonly api = inject(PermissionService);
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
  readonly typeOptions: { value: PermissionType; label: string }[] = [
    { value: 'API', label: 'API' },
    { value: 'OBJECT', label: 'OBJECT' },
    { value: 'FEATURE', label: 'FEATURE' },
  ];
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    codename: ['', [Validators.required, Validators.maxLength(100)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    description: [''],
    permission_type: [null as PermissionType | null],
    groups: [[] as number[]],
  });

  ngOnInit(): void {
    this.groupsApi.dropdown<NamedRef>().subscribe({
      next: (items) => this.groups.set(items),
      error: () => this.groups.set([]),
    });
    if (this.id !== null) {
      this.loadPermission(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: PermissionPayload = {
      codename: value.codename.trim(),
      name: value.name.trim(),
      description: value.description.trim(),
      groups: value.groups,
    };
    if (value.permission_type) {
      body.permission_type = value.permission_type;
    }
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
    void this.router.navigate(['/company/permissions']);
  }

  private loadPermission(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (permission) => {
        this.form.patchValue({
          codename: permission.codename,
          name: permission.name,
          description: permission.description ?? '',
          permission_type: permission.permission_type ?? null,
          groups: (permission.groups ?? []).map((g) => g.id),
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
    if (error.status === 0 || error.status === 401 || error.status >= 500) {
      return; // already shown by the global error handling
    }
    this.formErrors.set(applyServerErrors(this.form, error));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
