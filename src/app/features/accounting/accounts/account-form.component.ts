import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { ACCOUNT_TYPES, Account, AccountPayload, AccountType } from '../accounting.models';
import { AccountService } from './account.service';

/**
 * Create or edit an account. The parent must be a group account of the same type (the backend's rule), and can't
 * be the account itself or one of its descendants. System accounts keep their type.
 */
@Component({
  selector: 'app-account-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-form.component.html',
})
export class AccountFormComponent implements OnInit {
  private readonly api = inject(AccountService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly accounts = signal<Account[]>([]);
  readonly record = signal<Account | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly typeOptions = ACCOUNT_TYPES.map((type) => ({ value: type, label: `accounting.accountTypes.${type}` }));

  readonly form = inject(NonNullableFormBuilder).group({
    code: ['', [Validators.required, Validators.maxLength(20)]],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    account_type: ['asset' as AccountType, Validators.required],
    parent: [null as number | null],
    is_group: [false],
    is_active: [true],
    description: [''],
  });

  private readonly accountType = toSignal(this.form.controls.account_type.valueChanges, { initialValue: this.form.controls.account_type.value });

  readonly parentOptions = computed(() => {
    const excluded = this.descendantsOf(this.id);
    return this.accounts()
      .filter((account) => account.is_group && account.account_type === this.accountType() && !excluded.has(account.id))
      .map((account) => ({ value: account.id, label: `${account.code} ${account.name}` }));
  });

  ngOnInit(): void {
    this.api.all().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        const record = this.id !== null ? accounts.find((account) => account.id === this.id) : undefined;
        if (this.id !== null && !record) {
          this.loadError.set({ status: 404, message: '', errors: {} });
        } else if (record) {
          this.patch(record);
        }
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
    // A parent of another type is no longer valid.
    this.form.controls.account_type.valueChanges.subscribe(() => {
      const parent = this.form.controls.parent.value;
      if (parent !== null && !this.parentOptions().some((option) => option.value === parent)) {
        this.form.controls.parent.setValue(null);
      }
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: AccountPayload = {
      code: value.code.trim(),
      name: value.name.trim(),
      account_type: value.account_type,
      parent: value.parent,
      is_group: value.is_group,
      is_active: value.is_active,
      description: value.description.trim(),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, payload) : this.api.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(['/accounting/accounts']);
  }

  private patch(record: Account): void {
    this.record.set(record);
    this.form.patchValue({
      code: record.code,
      name: record.name,
      account_type: record.account_type,
      parent: record.parent,
      is_group: record.is_group,
      is_active: record.is_active,
      description: record.description,
    });
    if (record.system_key) {
      this.form.controls.account_type.disable();
      this.form.controls.is_group.disable();
    }
  }

  /** The account and everything under it (none of them can become its parent). */
  private descendantsOf(id: number | null): Set<number> {
    const result = new Set<number>();
    if (id === null) {
      return result;
    }
    result.add(id);
    let added = true;
    while (added) {
      added = false;
      for (const account of this.accounts()) {
        if (account.parent !== null && result.has(account.parent) && !result.has(account.id)) {
          result.add(account.id);
          added = true;
        }
      }
    }
    return result;
  }
}
