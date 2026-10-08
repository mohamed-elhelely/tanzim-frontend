import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { omitPristine } from '../../../shared/utils/omit-pristine';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { SelectOption } from '../../company/company.models';
import { InventoryRef, ProductVariantPayload } from '../inventory.models';
import { ProductService } from '../products/product.service';
import { ProductVariantService } from './product-variant.service';

/** ⚠️ Not returned by the read endpoint: shown empty on edit and only sent when changed (see omitPristine). */
const NOT_RETURNED = ['weight_uom'] as const;

const DECIMAL_4 = /^\d+(\.\d{1,4})?$/;
const DECIMAL_3 = /^\d+(\.\d{1,3})?$/;

/** One attribute: a name (key) and its value. */
type AttributeRow = FormGroup<{ key: FormControl<string>; value: FormControl<string> }>;

/** Attribute names must be unique (they become the keys of the `attributes` object). */
function uniqueKeys(array: AbstractControl): ValidationErrors | null {
  const keys = (array as FormArray<AttributeRow>).getRawValue().map((row) => row.key.trim().toLowerCase());
  return new Set(keys).size === keys.length ? null : { duplicateKeys: true };
}

@Component({
  selector: 'app-product-variant-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-variant-form.component.html',
})
export class ProductVariantFormComponent implements OnInit {
  private readonly api = inject(ProductVariantService);
  private readonly productsApi = inject(ProductService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);

  readonly id = Number(this.route.snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly productOptions = signal<SelectOption[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly form = this.fb.group({
    product: [null as number | null, [Validators.required]],
    sku: ['', [Validators.required, Validators.maxLength(100)]],
    name: ['', [Validators.required, Validators.maxLength(255)]],
    barcode: ['', [Validators.maxLength(100)]],
    standard_cost: ['', [Validators.pattern(DECIMAL_4)]],
    standard_price: ['', [Validators.pattern(DECIMAL_4)]],
    weight: ['', [Validators.pattern(DECIMAL_3)]],
    weight_uom: ['', [Validators.maxLength(10)]],
    attributes: this.fb.array<AttributeRow>([], { validators: uniqueKeys }),
    is_active: [true],
  });

  get attributes(): FormArray<AttributeRow> {
    return this.form.controls.attributes;
  }

  ngOnInit(): void {
    this.productsApi.dropdown<InventoryRef>().subscribe({
      next: (items) => this.productOptions.set(items.map((item) => ({ value: item.id, label: item.name }))),
      error: () => this.productOptions.set([]),
    });
    if (this.id !== null) {
      this.loadVariant(this.id);
    } else {
      // Opened from a product's variants: preselect it. `kg` is the backend's default unit.
      const product = Number(this.route.snapshot.queryParamMap.get('product')) || null;
      this.form.patchValue({ product, weight_uom: 'kg' });
    }
  }

  addAttribute(key = '', value = ''): void {
    this.attributes.push(
      this.fb.group({ key: [key, [Validators.required, Validators.maxLength(50)]], value: [value, [Validators.maxLength(100)]] }),
    );
  }

  removeAttribute(index: number): void {
    this.attributes.removeAt(index);
    this.attributes.markAsDirty();
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const payload: ProductVariantPayload = {
      product: value.product,
      sku: value.sku.trim(),
      name: value.name.trim(),
      barcode: value.barcode.trim(),
      attributes: Object.fromEntries(value.attributes.map((row) => [row.key.trim(), row.value.trim()])),
      standard_cost: value.standard_cost.trim() || null,
      standard_price: value.standard_price.trim() || null,
      weight: value.weight.trim() || null,
      weight_uom: value.weight_uom.trim(),
      is_active: value.is_active,
    };
    const body = omitPristine(payload, this.form, NOT_RETURNED);
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('common.saved'));
        this.goBack();
      },
      error: (error: AppError) => this.onSaveError(error),
    });
  }

  goBack(): void {
    const product = this.form.controls.product.value;
    void this.router.navigate(['/inventory/variants'], { queryParams: product ? { product } : {} });
  }

  private loadVariant(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (variant) => {
        this.form.patchValue({
          product: variant.product?.id ?? null,
          sku: variant.sku,
          name: variant.name,
          barcode: variant.barcode ?? '',
          standard_cost: variant.standard_cost ?? '',
          standard_price: variant.standard_price ?? '',
          weight: variant.weight ?? '',
          is_active: variant.is_active,
        });
        Object.entries(variant.attributes ?? {}).forEach(([key, value]) => this.addAttribute(key, String(value)));
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  private onSaveError(error: AppError): void {
    this.saving.set(false);
    this.formErrors.set(handleSaveError(this.form, error, this.notifications));
  }
}
