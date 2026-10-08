import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { Address } from '../sales.models';

export type AddressForm = FormGroup<{
  street: FormControl<string>;
  city: FormControl<string>;
  state: FormControl<string>;
  zip: FormControl<string>;
  country: FormControl<string>;
}>;

export function addressGroup(fb: NonNullableFormBuilder): AddressForm {
  return fb.group({
    street: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.maxLength(100)]],
    state: ['', [Validators.maxLength(100)]],
    zip: ['', [Validators.maxLength(20)]],
    country: ['', [Validators.maxLength(100)]],
  });
}

/** Trimmed, with empty parts dropped, so an untouched address is sent as `{}` (the backend default). */
export function toAddress(form: AddressForm): Address {
  const address: Address = {};
  for (const [key, value] of Object.entries(form.getRawValue())) {
    const trimmed = value.trim();
    if (trimmed) {
      address[key as keyof Address] = trimmed;
    }
  }
  return address;
}

/** Fills the group from a stored address; unknown keys from other clients are ignored. */
export function patchAddress(form: AddressForm, address: Address | null | undefined): void {
  form.patchValue({
    street: address?.street ?? '',
    city: address?.city ?? '',
    state: address?.state ?? '',
    zip: address?.zip ?? '',
    country: address?.country ?? '',
  });
}

/** Street, city, state, postal code and country inputs for a billing or shipping address. */
@Component({
  selector: 'app-address-fields',
  imports: [ReactiveFormsModule, TranslatePipe, InputTextModule, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './address-fields.component.html',
})
export class AddressFieldsComponent {
  @Input({ required: true }) group!: AddressForm;
  /** Keeps input ids unique when a form has two addresses. */
  @Input({ required: true }) idPrefix!: string;
}
