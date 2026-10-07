import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/auth/auth.service';
import { AppError } from '../../../core/errors/app-error';
import { LanguageService } from '../../../core/services/language.service';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
    selector: 'app-login-page',
    imports: [ReactiveFormsModule, TranslatePipe, InputTextModule, PasswordModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './login-page.component.html',
    styleUrl: './login-page.component.scss'
})
export class LoginPageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);
  readonly features = ['auth.features.organisation', 'auth.features.locations', 'auth.features.bilingual'];
  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.login(email, password).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/dashboard']);
      },
      error: (error: AppError) => {
        this.submitting.set(false);
        this.errorMessage.set(this.loginErrorMessage(error));
      },
    });
  }

  // Network errors and 5xx are already shown as a toast by the error interceptor.
  private loginErrorMessage(error: AppError): string | null {
    if (error.status === 429) {
      return this.translate.instant('auth.tooManyAttempts');
    }
    if (error.status < 400 || error.status >= 500) {
      return null;
    }

    const errors = error.errors ?? {};
    const serverMessage = errors['non_field_errors']?.[0] ?? Object.values(errors).flat()[0];
    if (serverMessage) {
      return serverMessage;
    }
    if (error.message && error.message !== 'Unknown error') {
      return error.message;
    }
    return this.translate.instant('auth.invalidCredentials');
  }
}
