import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DropdownModule } from 'primeng/dropdown';
import { InputSwitchModule } from 'primeng/inputswitch';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { Observable } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { localizedName } from '../../../shared/pipes/localized-name.pipe';
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { CompanyUserPayload, NamedRef, SelectOption } from '../company.models';
import { DepartmentService } from '../departments/department.service';
import { RoleService } from '../roles/role.service';
import { TeamService } from '../teams/team.service';
import { CompanyUserService } from './company-user.service';

/** Login-account fields. Only sent on create: the backend can't update the nested user. */
const LOGIN_FIELDS = ['email', 'first_name', 'last_name', 'preferred_name', 'phone_number'] as const;

/** Server errors arrive nested under "user"; map them to this form's flat controls. */
const USER_FIELD_MAP: Record<string, string> = {
  'user.email': 'email',
  'user.first_name': 'first_name',
  'user.last_name': 'last_name',
  'user.preferred_name': 'preferred_name',
  'user.phone_number': 'phone_number',
  'user.password': 'password',
};

@Component({
    selector: 'app-user-form',
    imports: [
        ReactiveFormsModule,
        TranslatePipe,
        ButtonModule,
        CardModule,
        DropdownModule,
        InputSwitchModule,
        InputTextModule,
        PasswordModule,
        PageHeaderComponent,
        LoadingStateComponent,
        ErrorStateComponent,
        FieldErrorComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './user-form.component.html'
})
export class UserFormComponent implements OnInit {
  private readonly api = inject(CompanyUserService);
  private readonly rolesApi = inject(RoleService);
  private readonly departmentsApi = inject(DepartmentService);
  private readonly teamsApi = inject(TeamService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly roles = signal<NamedRef[]>([]);
  private readonly departments = signal<NamedRef[]>([]);
  private readonly teams = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly roleOptions = computed<SelectOption[]>(() => this.toOptions(this.roles()));
  readonly departmentOptions = computed<SelectOption[]>(() => this.toOptions(this.departments()));
  readonly teamOptions = computed<SelectOption[]>(() => this.toOptions(this.teams()));
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    first_name: ['', [Validators.required, Validators.maxLength(100)]],
    last_name: ['', [Validators.required, Validators.maxLength(100)]],
    preferred_name: ['', [Validators.maxLength(100)]],
    phone_number: ['', [Validators.maxLength(128)]],
    password: ['', this.isEdit ? [] : [Validators.required, Validators.maxLength(128)]],
    role: [null as number | null],
    department: [null as number | null],
    team: [null as number | null],
    is_company_admin: [false],
    is_department_manager: [false],
    is_team_lead: [false],
  });

  ngOnInit(): void {
    this.rolesApi.dropdown<NamedRef>().subscribe({ next: (r) => this.roles.set(r), error: () => this.roles.set([]) });
    this.departmentsApi
      .dropdown<NamedRef>()
      .subscribe({ next: (d) => this.departments.set(d), error: () => this.departments.set([]) });
    this.teamsApi.dropdown<NamedRef>().subscribe({ next: (t) => this.teams.set(t), error: () => this.teams.set([]) });
    if (this.id !== null) {
      this.loadUser(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const assignment: Omit<CompanyUserPayload, 'user'> = {
      role: value.role,
      department: value.department,
      team: value.team,
      is_company_admin: value.is_company_admin,
      is_department_manager: value.is_department_manager,
      is_team_lead: value.is_team_lead,
    };
    // PATCH with a nested `user` is rejected by the backend (the unchanged email fails its unique check),
    // so editing only changes the assignment; the login account is set once, on create.
    const request: Observable<unknown> =
      this.id !== null
        ? this.api.update(this.id, assignment)
        : this.api.create({
            ...assignment,
            user: {
              email: value.email.trim(),
              first_name: value.first_name.trim(),
              last_name: value.last_name.trim(),
              preferred_name: value.preferred_name.trim(),
              phone_number: value.phone_number.trim(),
              password: value.password,
            },
          });
    this.saving.set(true);
    this.formErrors.set([]);
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
    void this.router.navigate(['/company/users']);
  }

  private toOptions(items: NamedRef[]): SelectOption[] {
    return items.map((item) => ({ value: item.id, label: localizedName(item, this.lang()) }));
  }

  private loadUser(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (companyUser) => {
        this.form.patchValue({
          email: companyUser.user.email,
          first_name: companyUser.user.first_name,
          last_name: companyUser.user.last_name,
          preferred_name: companyUser.user.preferred_name ?? '',
          phone_number: companyUser.user.phone_number ?? '',
          role: companyUser.role?.id ?? null,
          department: companyUser.department?.id ?? null,
          team: companyUser.team?.id ?? null,
          is_company_admin: companyUser.is_company_admin,
          is_department_manager: companyUser.is_department_manager,
          is_team_lead: companyUser.is_team_lead,
        });
        LOGIN_FIELDS.forEach((name) => this.form.controls[name].disable());
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
    this.formErrors.set(applyServerErrors(this.form, error, USER_FIELD_MAP));
    if (Object.keys(error.errors ?? {}).length === 0) {
      this.notifications.error(error.message);
    }
  }
}
