import { signal } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

/**
 * The ControlValueAccessor plumbing shared by the form wrappers (select, multi-select, toggle, password): they take
 * `formControlName` / `ngModel` like a native input and pass the value to the library control inside.
 */
export abstract class FormControlBase<T> implements ControlValueAccessor {
  readonly value = signal<T | null>(null);
  readonly isDisabled = signal(false);
  private onChange: (value: T | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.isDisabled.set(disabled);
  }

  /** The user changed the value inside. */
  protected update(value: T | null): void {
    this.value.set(value);
    this.onChange(value);
  }

  protected touch(): void {
    this.onTouched();
  }
}
