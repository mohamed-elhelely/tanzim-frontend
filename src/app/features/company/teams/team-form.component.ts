import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SelectModule } from 'primeng/select';
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
import { applyServerErrors, errorTitleKey } from '../../../shared/utils/server-errors';
import { LocationService } from '../../locations/location.service';
import { NamedRef, SelectOption, TeamPayload } from '../company.models';
import { DepartmentService } from '../departments/department.service';
import { CompanyUserService } from '../users/company-user.service';
import { TeamService } from './team.service';

export type LocationState = 'loading' | 'ready' | 'forbidden' | 'empty' | 'error';

@Component({
    selector: 'app-team-form',
    imports: [
        ReactiveFormsModule,
        TranslatePipe,
        ButtonModule,
        CardModule,
        SelectModule,
        InputTextModule,
        MultiSelectModule,
        PageHeaderComponent,
        LoadingStateComponent,
        ErrorStateComponent,
        FieldErrorComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './team-form.component.html'
})
export class TeamFormComponent implements OnInit {
  private readonly api = inject(TeamService);
  private readonly departmentsApi = inject(DepartmentService);
  private readonly locationsApi = inject(LocationService);
  private readonly users = inject(CompanyUserService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly lang = inject(LanguageService).currentLang;
  private readonly departments = signal<NamedRef[]>([]);
  private readonly locations = signal<NamedRef[]>([]);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly userOptions = signal<SelectOption[]>([]);
  readonly locationState = signal<LocationState>('loading');
  readonly canSave = computed(() => this.locationState() === 'ready');
  readonly departmentOptions = computed<SelectOption[]>(() =>
    this.departments().map((d) => ({ value: d.id, label: localizedName(d, this.lang()) })),
  );
  readonly locationOptions = computed<SelectOption[]>(() =>
    this.locations().map((l) => ({ value: l.id, label: localizedName(l, this.lang()) })),
  );
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    department: [null as number | null, [Validators.required]],
    name_en: ['', [Validators.required, Validators.maxLength(100)]],
    name_ar: ['', [Validators.maxLength(100)]],
    location: [null as number | null, [Validators.required]],
    leads: [[] as number[]],
  });

  ngOnInit(): void {
    this.departmentsApi.dropdown<NamedRef>().subscribe({
      next: (items) => this.departments.set(items),
      error: () => this.departments.set([]),
    });
    this.users.userOptions().subscribe({
      next: (options) => this.userOptions.set(options),
      error: () => this.userOptions.set([]),
    });
    this.locationsApi.dropdown<NamedRef>().subscribe({
      next: (items) => {
        this.locations.set(items);
        this.locationState.set(items.length ? 'ready' : 'empty');
      },
      error: (error: AppError) => this.locationState.set(error.status === 403 ? 'forbidden' : 'error'),
    });
    if (this.id !== null) {
      this.loadTeam(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving() || !this.canSave()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: TeamPayload = {
      department: value.department as number,
      name_en: value.name_en.trim(),
      name_ar: value.name_ar.trim() || null,
      location: value.location as number,
      leads: value.leads,
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
    void this.router.navigate(['/company/teams']);
  }

  private loadTeam(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (team) => {
        this.form.patchValue({
          department: team.department?.id ?? null,
          name_en: team.name_en,
          name_ar: team.name_ar ?? '',
          location: team.location?.id ?? null,
          leads: (team.leads ?? []).map((lead) => lead.id),
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
