import { FormControl, FormGroup } from '@angular/forms';
import { AppError } from '../../core/errors/app-error';
import { applyServerErrors, errorTitleKey } from './server-errors';

function makeForm() {
  return new FormGroup({
    name_en: new FormControl(''),
    email: new FormControl(''),
  });
}

function error(errors: Record<string, unknown>, status = 400): AppError {
  return { status, message: 'Unknown error', errors: errors as Record<string, string[]> };
}

describe('applyServerErrors', () => {
  it('puts field messages on the matching control and marks it touched', () => {
    const form = makeForm();
    const rest = applyServerErrors(form, error({ name_en: ['Already exists.'] }));

    expect(form.controls.name_en.errors).toEqual({ serverError: 'Already exists.' });
    expect(form.controls.name_en.touched).toBeTrue();
    expect(rest).toEqual([]);
  });

  it('maps nested keys through the field map', () => {
    const form = makeForm();
    applyServerErrors(form, error({ user: { email: ['Taken.'] } }), { 'user.email': 'email' });
    expect(form.controls.email.errors).toEqual({ serverError: 'Taken.' });
  });

  it('returns non_field_errors and unknown fields', () => {
    const form = makeForm();
    const rest = applyServerErrors(form, error({ non_field_errors: ['Bad combo.'], color: ['Nope.'] }));
    expect(rest).toEqual(['Bad combo.', 'Nope.']);
  });

  it('clears the server error when the value changes', () => {
    const form = makeForm();
    applyServerErrors(form, error({ name_en: ['Already exists.'] }));
    form.controls.name_en.setValue('Other');
    expect(form.controls.name_en.errors).toBeNull();
  });
});

describe('errorTitleKey', () => {
  it('maps status codes to title keys', () => {
    expect(errorTitleKey(error({}, 404))).toBe('common.notFound');
    expect(errorTitleKey(error({}, 403))).toBe('common.forbidden');
    expect(errorTitleKey(error({}, 500))).toBe('common.error');
    expect(errorTitleKey(null)).toBe('common.error');
  });
});
