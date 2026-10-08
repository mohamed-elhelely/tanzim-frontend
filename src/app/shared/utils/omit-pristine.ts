import { FormGroup } from '@angular/forms';

/**
 * ⚠️ Some read endpoints (inventory warehouses, zones, bins, suppliers) don't return every field, so an edit
 * form can't show the saved value. Sending those fields anyway would overwrite the saved value with "".
 * On edit, this drops the listed fields unless the user changed them, so the PATCH leaves them alone.
 * Remove its uses once the backend returns full objects (docs/BACKEND_REQUESTS.md 15e).
 */
export function omitPristine<T extends object>(body: T, form: FormGroup, fields: readonly (keyof T & string)[]): Partial<T> {
  const result: Partial<T> = { ...body };
  for (const field of fields) {
    if (!form.get(field)?.dirty) {
      delete result[field];
    }
  }
  return result;
}
