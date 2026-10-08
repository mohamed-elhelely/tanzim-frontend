import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
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
import { SelectOption } from '../../company/company.models';
import { Category, CategoryPayload } from '../inventory.models';
import { CategoryService } from './category.service';

@Component({
  selector: 'app-category-form',
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
  templateUrl: './category-form.component.html',
})
export class CategoryFormComponent implements OnInit {
  private readonly api = inject(CategoryService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  private readonly categories = signal<Category[]>([]);
  /** Name and parent as loaded; see submit() for why they are only sent when changed. */
  private loaded: { name: string; parent: number | null } | null = null;
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
    const name = value.name.trim();
    const body: CategoryPayload = { description: value.description.trim(), is_active: value.is_active };
    // The backend's duplicate check doesn't exclude the record itself, so re-sending an unchanged
    // name and parent fails with "already exists". Send them only on create or when they change.
    if (!this.loaded || name !== this.loaded.name || value.parent !== this.loaded.parent) {
      body.name = name;
      body.parent = value.parent;
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
    void this.router.navigate(['/inventory/categories']);
  }

  private loadCategory(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (category) => {
        this.loaded = { name: category.name, parent: category.parent?.id ?? null };
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
