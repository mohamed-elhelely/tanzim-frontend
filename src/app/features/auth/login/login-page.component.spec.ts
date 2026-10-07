import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { AuthService } from '../../../core/auth/auth.service';
import { LoginPageComponent } from './login-page.component';

describe('LoginPageComponent', () => {
  let loginSpy: jasmine.Spy;

  beforeEach(async () => {
    loginSpy = jasmine.createSpy('login').and.returnValue(of({}));
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [
        provideRouter([]),
        provideAnimations(),
        provideTranslateService(),
        MessageService,
        { provide: AuthService, useValue: { login: loginSpy } },
      ],
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  it('creates the login page', () => {
    const fixture = TestBed.createComponent(LoginPageComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('does not submit an invalid form', () => {
    const component = TestBed.createComponent(LoginPageComponent).componentInstance;
    component.submit();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('submits valid credentials', () => {
    const component = TestBed.createComponent(LoginPageComponent).componentInstance;
    component.form.setValue({ email: 'admin@example.com', password: 'secret' });
    component.submit();
    expect(loginSpy).toHaveBeenCalledWith('admin@example.com', 'secret');
  });

  function submitWithError(error: AppError) {
    loginSpy.and.returnValue(throwError(() => error));
    const fixture = TestBed.createComponent(LoginPageComponent);
    const component = fixture.componentInstance;
    component.form.setValue({ email: 'admin@example.com', password: 'nope' });
    component.submit();
    fixture.detectChanges();
    return { fixture, component };
  }

  it('shows the server message when the credentials are rejected', () => {
    const { fixture, component } = submitWithError({
      status: 400,
      message: 'Unknown error',
      errors: { non_field_errors: ['Unable to log in with provided credentials.'] },
    });

    expect(component.errorMessage()).toBe('Unable to log in with provided credentials.');
    expect(fixture.nativeElement.textContent).toContain('Unable to log in with provided credentials.');
  });

  it('falls back to the translated message when the server gives no details', () => {
    const { component } = submitWithError({ status: 400, message: 'Unknown error', errors: {} });
    expect(component.errorMessage()).toBe('auth.invalidCredentials');
  });

  it('shows a rate-limit message on 429', () => {
    const { component } = submitWithError({ status: 429, message: 'Throttled', errors: {} });
    expect(component.errorMessage()).toBe('auth.tooManyAttempts');
  });

  it('leaves network and server errors to the global toast', () => {
    const { component } = submitWithError({ status: 500, message: 'Server error', errors: {} });
    expect(component.errorMessage()).toBeNull();
  });

  it('re-enables the form after a failed attempt', () => {
    const { component } = submitWithError({ status: 400, message: 'Unknown error', errors: {} });
    expect(component.submitting()).toBeFalse();
  });

  it('clears the previous error when submitting again', () => {
    const { component } = submitWithError({ status: 400, message: 'Unknown error', errors: {} });
    loginSpy.and.returnValue(of({}));
    component.submit();
    expect(component.errorMessage()).toBeNull();
  });
});
