import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { MessageService } from 'primeng/api';
import { of } from 'rxjs';
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
});
