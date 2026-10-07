import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { DepartmentPayload, NamedRef, SelectOption } from '../company.models';
import { CompanyUserService } from '../users/company-user.service';
import { DepartmentService } from './department.service';

@Component({
    selector: 'app-department-form',
    imports: [
        ReactiveFormsModule,
        TranslatePipe,
        ButtonModule,
        CardModule,
        SelectModule,
        InputTextModule,
        PageHeaderComponent,
        LoadingStateComponent,
        ErrorStateComponent,
        FieldErrorComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './department-form.component.html'
})
export class DepartmentFormComponent implements OnInit {
  private readonly api = inject(DepartmentService);
  private readonly users = inject(CompanyUserService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly departments = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly userOptions = signal<SelectOption[]>([]);
  readonly parentOptions = computed<SelectOption[]>(() =>
    this.departments()
      .filter((d) => d.id !== this.id)
      .map((d) => ({ value: d.id, label: localizedName(d, this.lang()) })),
  );
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    parent: [null as number | null],
    manager: [null as number | null],
  });

  ngOnInit(): void {
    this.api.dropdown<NamedRef>().subscribe({
      next: (items) => this.departments.set(items),
      error: () => this.departments.set([]),
    });
    this.users.userOptions().subscribe({
      next: (options) => this.userOptions.set(options),
      error: () => this.userOptions.set([]),
    });
    if (this.id !== null) {
      this.loadDepartment(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: DepartmentPayload = {
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      parent: value.parent,
      manager: value.manager,
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
    void this.router.navigate(['/company/departments']);
  }

  private loadDepartment(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (department) => {
        this.form.patchValue({
          name_en: department.name_en,
          name_ar: department.name_ar ?? '',
          parent: department.parent?.id ?? null,
          manager: department.manager?.id ?? null,
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
