import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { AccessService } from '../../core/auth/access.service';
import { AppError } from '../../core/errors/app-error';
import { NotificationService } from '../../core/services/notification.service';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../shared/components/field-error/field-error.component';
import { ImagePickerComponent } from '../../shared/components/image-picker/image-picker.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../shared/utils/server-errors';
import { MeProfile, ProfileService } from './profile.service';

/** The browser's IANA time zones, for the timezone picker. */
const TIME_ZONES: string[] = (Intl as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.('timeZone') ?? [];

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { new_password, confirm_password } = group.value as { new_password: string; confirm_password: string };
  return confirm_password && new_password !== confirm_password ? { mismatch: true } : null;
}

/** /profile: the signed-in user's own details, picture and password. */
@Component({
  selector: 'app-profile-page',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
    ImagePickerComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.component.html',
})
export class ProfilePageComponent implements OnInit {
  private readonly api = inject(ProfileService);
  private readonly access = inject(AccessService);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly picker = viewChild(ImagePickerComponent);

  readonly loading = signal(true);
  readonly loadError = signal<AppError | null>(null);
  readonly saving = signal(false);
  readonly changingPassword = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly passwordErrors = signal<string[]>([]);
  readonly errorTitleKey = errorTitleKey;
  readonly email = computed(() => this.access.current()?.user.email ?? '');
  readonly pictureUrl = signal<string | null>(null);
  /** undefined = unchanged, null = remove, File = upload. */
  private pendingPicture: File | null | undefined = undefined;

  readonly timeZones = TIME_ZONES.map((zone) => ({ value: zone, label: zone.replace(/_/g, ' ') }));

  readonly form = this.fb.group({
    first_name: ['', [Validators.required, Validators.maxLength(150)]],
    middle_name: ['', [Validators.maxLength(150)]],
    last_name: ['', [Validators.required, Validators.maxLength(150)]],
    preferred_name: ['', [Validators.maxLength(150)]],
    phone_number: [''],
    timezone: [''],
  });

  readonly passwordForm = this.fb.group(
    {
      current_password: ['', [Validators.required]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly initials = computed(() => {
    const user = this.access.current()?.user;
    return ((user?.first_name?.[0] ?? '') + (user?.last_name?.[0] ?? '')).toUpperCase();
  });

  ngOnInit(): void {
    this.api.load().subscribe({
      next: (profile) => {
        this.fill(profile);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  onPicture(file: File | null): void {
    this.pendingPicture = file;
    this.form.markAsDirty();
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const changes = {
      first_name: value.first_name.trim(),
      middle_name: value.middle_name.trim(),
      last_name: value.last_name.trim(),
      preferred_name: value.preferred_name.trim(),
      phone_number: value.phone_number.trim(),
      timezone: value.timezone,
      ...(this.pendingPicture !== undefined ? { profile_picture: this.pendingPicture } : {}),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    this.api.update(changes).subscribe({
      next: (profile) => {
        this.saving.set(false);
        this.fill(profile);
        // The header shows the new name and picture straight away.
        this.access.update((me) => ({
          ...me,
          user: { ...me.user, first_name: profile.first_name, last_name: profile.last_name, profile_picture: profile.profile_picture },
        }));
        this.notifications.success(this.translate.instant('common.saved'));
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.changingPassword()) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const { current_password, new_password } = this.passwordForm.getRawValue();
    this.changingPassword.set(true);
    this.passwordErrors.set([]);
    this.api.changePassword({ current_password, new_password }).subscribe({
      next: () => {
        this.changingPassword.set(false);
        this.passwordForm.reset();
        this.notifications.success(this.translate.instant('profile.passwordChanged'));
      },
      error: (error: AppError) => {
        this.changingPassword.set(false);
        this.passwordErrors.set(handleSaveError(this.passwordForm, error, this.notifications));
      },
    });
  }

  private fill(profile: MeProfile): void {
    this.form.reset({
      first_name: profile.first_name ?? '',
      middle_name: profile.middle_name ?? '',
      last_name: profile.last_name ?? '',
      preferred_name: profile.preferred_name ?? '',
      phone_number: profile.phone_number ?? '',
      timezone: profile.timezone ?? '',
    });
    this.pictureUrl.set(profile.profile_picture);
    this.pendingPicture = undefined;
    this.picker()?.reset();
  }
}
