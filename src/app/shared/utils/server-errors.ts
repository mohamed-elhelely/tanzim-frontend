import { FormGroup } from '@angular/forms';
import { AppError } from '../../core/errors/app-error';
import { NotificationService } from '../../core/services/notification.service';

const NON_FIELD_ERRORS = 'non_field_errors';

/**
 * Puts backend validation messages (`error.errors`) on matching controls as `{ serverError }`.
 * Nested keys are flattened with dots ("user.email"); `fieldMap` renames them to control names.
 * Returns the messages that matched no control (including non_field_errors) for a top-of-form alert.
 * Angular re-runs validators when the value changes, which clears `serverError` automatically.
 */
export function applyServerErrors(
  form: FormGroup,
  error: AppError,
  fieldMap: Record<string, string> = {},
): string[] {
  const unmatched: string[] = [];
  for (const [field, messages] of flattenErrors(error.errors ?? {}, '')) {
    const control = field === NON_FIELD_ERRORS ? null : form.get(fieldMap[field] ?? field);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), serverError: messages.join(' ') });
      control.markAsTouched();
    } else {
      unmatched.push(...messages);
    }
  }
  return unmatched;
}

/**
 * What every form does when a save fails. Returns the messages for the alert above the form.
 * - network, 401 and 5xx: nothing here, the interceptors already told the user;
 * - field errors: shown under the matching controls (see applyServerErrors);
 * - a 4xx without field errors: the backend's message as a toast.
 */
export function handleSaveError(
  form: FormGroup,
  error: AppError,
  notifications: NotificationService,
  fieldMap: Record<string, string> = {},
): string[] {
  if (error.status === 0 || error.status === 401 || error.status >= 500) {
    return [];
  }
  if (Object.keys(error.errors ?? {}).length === 0) {
    notifications.error(error.message);
  }
  return applyServerErrors(form, error, fieldMap);
}

/** Translation key for an ErrorState title. */
export function errorTitleKey(error: AppError | null): string {
  if (error?.status === 404) {
    return 'common.notFound';
  }
  if (error?.status === 403) {
    return 'common.forbidden';
  }
  return 'common.error';
}

function flattenErrors(errors: unknown, prefix: string): Array<[string, string[]]> {
  if (Array.isArray(errors)) {
    const messages = errors.filter((item): item is string => typeof item === 'string');
    const nested = errors.flatMap((item, index) =>
      item && typeof item === 'object' ? flattenErrors(item, `${prefix}.${index}`) : [],
    );
    return messages.length ? [[prefix, messages], ...nested] : nested;
  }
  if (errors && typeof errors === 'object') {
    return Object.entries(errors).flatMap(([key, value]) => flattenErrors(value, prefix ? `${prefix}.${key}` : key));
  }
  return typeof errors === 'string' ? [[prefix, [errors]]] : [];
}
