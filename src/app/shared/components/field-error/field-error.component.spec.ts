import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { provideTranslateService } from '@ngx-translate/core';
import { FieldErrorComponent } from './field-error.component';

describe('FieldErrorComponent', () => {
  function render(control: FormControl, patternKey?: string) {
    TestBed.configureTestingModule({ imports: [FieldErrorComponent], providers: [provideTranslateService()] });
    const fixture = TestBed.createComponent(FieldErrorComponent);
    fixture.componentRef.setInput('control', control);
    if (patternKey) {
      fixture.componentRef.setInput('patternKey', patternKey);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('shows nothing while untouched', () => {
    const fixture = render(new FormControl('', Validators.required));
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('shows the required message once touched', () => {
    const control = new FormControl('', Validators.required);
    control.markAsTouched();
    expect(render(control).nativeElement.textContent).toContain('validation.required');
  });

  it('prefers the server message', () => {
    const control = new FormControl('x');
    control.setErrors({ serverError: 'Already exists.' });
    control.markAsTouched();
    expect(render(control).nativeElement.textContent).toContain('Already exists.');
  });

  it('shows the minimum length', () => {
    const control = new FormControl('ab', Validators.minLength(3));
    control.markAsTouched();
    expect(render(control).nativeElement.textContent).toContain('validation.minLength');
  });

  it('explains a pattern error with the given key', () => {
    const control = new FormControl('x', Validators.pattern(/^[A-Z]{2}$/));
    control.markAsTouched();
    expect(render(control, 'locations.hints.isoCode').nativeElement.textContent).toContain('locations.hints.isoCode');
  });
});
