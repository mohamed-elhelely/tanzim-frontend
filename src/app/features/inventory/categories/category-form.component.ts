import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { FormLayoutComponent } from '../../../shared/components/form-layout/form-layout.component';
import { injectFormContext } from '../../../shared/forms/form-context';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { SelectOption } from '../../company/company.models';
import { Category, CategoryPayload } from '../inventory.models';
import { CategoryService } from './category.service';

@Component({
  selector: 'app-category-form',
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
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent implements OnInit {
  private readonly api = inject(CategoryService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  /** Page (/new, /:id/edit) or dialog opened from the list. */
  private readonly ctx = injectFormContext(['/inventory/categories']);
  readonly id = this.ctx.id;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  private readonly categories = signal<Category[]>([]);
  /** Every category except this one and its descendants, so the tree can't loop. */
  readonly parentOptions = computed<SelectOption[]>(() => {
    const excluded = this.id === null ? new Set<number>() : this.descendantsOf(this.id);
    return this.categories()
      .filter((category) => !excluded.has(category.id))
      .map((category) => ({ value: category.id, label: this.path(category) }));
  });

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    parent: [null as number | null],
    description: [''],
    is_active: [true],
  });

  ngOnInit(): void {
    this.api.listAll().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    if (this.id !== null) {
      this.loadCategory(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: CategoryPayload = {
      name: value.name.trim(),
      parent: value.parent,
      description: value.description.trim(),
      is_active: value.is_active,
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
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(saved = false): void {
    this.ctx.close(saved);
  }

  private loadCategory(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (category) => {
        this.form.patchValue({
          name: category.name,
          parent: category.parent?.id ?? null,
          description: category.description ?? '',
          is_active: category.is_active,
        });
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  /** "Electronics › Phones": the parent chain helps tell same-named categories apart. */
  private path(category: Category): string {
    const names: string[] = [];
    for (let current: Category | null = category; current; current = current.parent) {
      names.unshift(current.name);
    }
    return names.join(' › ');
  }

  private descendantsOf(id: number): Set<number> {
    const result = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const category of this.categories()) {
        if (category.parent && result.has(category.parent.id) && !result.has(category.id)) {
          result.add(category.id);
          grew = true;
        }
      }
    }
    return result;
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    this.formErrors.set(handleSaveError(this.form, error, this.notifications));
  }
}
