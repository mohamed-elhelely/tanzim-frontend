import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { startWith } from 'rxjs';
import { AccessService } from '../../../core/auth/access.service';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { ImagePickerComponent } from '../../../shared/components/image-picker/image-picker.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { CompanyProfile } from '../company.models';
import { CompanyProfileService } from './company-profile.service';

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/** /company/profile: the company's logo and brand colors. Read-only without `change_company`. */
@Component({
  selector: 'app-company-profile',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
    ImagePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './company-profile.component.html',
})
export class CompanyProfileComponent implements OnInit {
  private readonly api = inject(CompanyProfileService);
  private readonly access = inject(AccessService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly picker = viewChild(ImagePickerComponent);

  readonly canChange = computed(() => this.access.can('change_company'));
  readonly loading = signal(true);
  readonly loadError = signal<AppError | null>(null);
  readonly saving = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly company = signal<CompanyProfile | null>(null);
  /** The logo the preview shows: the saved one, or the one just picked. */
  readonly logoPreview = computed(() => {
    const picker = this.picker();
    return picker ? picker.shown() : (this.company()?.logo ?? null);
  });
  /** undefined = unchanged, null = remove, File = upload. */
  private pendingLogo: File | null | undefined = undefined;

  readonly form = inject(NonNullableFormBuilder).group({
    primary_color: ['#4F46E5', [Validators.required, Validators.pattern(HEX_COLOR)]],
    secondary_color: ['#FFFFFF', [Validators.required, Validators.pattern(HEX_COLOR)]],
  });
  private readonly colors = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  /** Live preview colors; an invalid value falls back to the saved one. */
  readonly primary = computed(() => this.valid(this.colors().primary_color) ?? this.company()?.primary_color ?? '#4F46E5');
  readonly secondary = computed(() => this.valid(this.colors().secondary_color) ?? this.company()?.secondary_color ?? '#FFFFFF');

  ngOnInit(): void {
    this.api.load().subscribe({
      next: (company) => {
        this.fill(company);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  onLogo(file: File | null): void {
    this.pendingLogo = file;
    this.form.markAsDirty();
  }

  /** The native color input only takes #rrggbb; keep the text field and the swatch in step. */
  pickColor(control: 'primary_color' | 'secondary_color', event: Event): void {
    const value = (event.target as HTMLInputElement).value.toUpperCase();
    this.form.controls[control].setValue(value);
    this.form.markAsDirty();
  }

  save(): void {
    if (!this.canChange() || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.formErrors.set([]);
    this.api
      .update({
        primary_color: value.primary_color.toUpperCase(),
        secondary_color: value.secondary_color.toUpperCase(),
        ...(this.pendingLogo !== undefined ? { logo: this.pendingLogo } : {}),
      })
      .subscribe({
        next: (company) => {
          this.saving.set(false);
          this.fill(company);
          // The sidebar shows the new logo at once.
          this.access.update((me) => ({
            ...me,
            company: me.company
              ? { ...me.company, logo: company.logo, primary_color: company.primary_color, secondary_color: company.secondary_color }
              : me.company,
          }));
          this.notifications.success(this.translate.instant('common.saved'));
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formErrors.set(handleSaveError(this.form, error, this.notifications));
        },
      });
  }

  private fill(company: CompanyProfile): void {
    this.company.set(company);
    this.form.reset({ primary_color: company.primary_color, secondary_color: company.secondary_color });
    if (!this.canChange()) {
      this.form.disable();
    }
    this.pendingLogo = undefined;
    this.picker()?.reset();
  }

  private valid(color: string | undefined): string | null {
    return color && HEX_COLOR.test(color) ? color : null;
  }
}
