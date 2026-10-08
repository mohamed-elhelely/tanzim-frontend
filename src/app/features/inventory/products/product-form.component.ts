import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { SelectOption } from '../../company/company.models';
import { BrandService } from '../brands/brand.service';
import { CategoryService } from '../categories/category.service';
import {
  InventoryRef,
  PRODUCT_TYPES,
  ProductPayload,
  ProductType,
  VALUATION_METHODS,
  ValuationMethod,
} from '../inventory.models';
import { ProductService } from './product.service';

@Component({
  selector: 'app-product-form',
  imports: [
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    TextareaModule,
    ToggleSwitchModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './product-form.component.html',
})
export class ProductFormComponent implements OnInit {
  private readonly api = inject(ProductService);
  private readonly categoriesApi = inject(CategoryService);
  private readonly brandsApi = inject(BrandService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly formErrors = signal<string[]>([]);
  readonly categoryOptions = signal<SelectOption[]>([]);
  readonly brandOptions = signal<SelectOption[]>([]);
  readonly productTypeOptions = PRODUCT_TYPES.map((type) => ({ value: type, label: `inventory.productTypes.${type}` }));
  readonly valuationOptions = VALUATION_METHODS.map((method) => ({ value: method, label: `inventory.valuation.${method}` }));
  readonly errorTitleKey = errorTitleKey;

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    product_type: ['simple' as ProductType, [Validators.required]],
    category: [null as number | null],
    brand: [null as number | null],
    default_uom: ['each', [Validators.required, Validators.maxLength(20)]],
    valuation_method: ['average' as ValuationMethod, [Validators.required]],
    description: [''],
    is_batch_tracked: [false],
    is_serial_tracked: [false],
    has_expiry: [false],
    // A string because it comes from an <input type="number">; converted on save.
    shelf_life_days: ['', [Validators.pattern(/^[1-9]\d*$/)]],
    is_active: [true],
    is_purchasable: [true],
    is_sellable: [true],
  });

  ngOnInit(): void {
    this.categoriesApi.dropdown<InventoryRef>().subscribe({
      next: (items) => this.categoryOptions.set(items.map((item) => ({ value: item.id, label: item.name }))),
      error: () => this.categoryOptions.set([]),
    });
    this.brandsApi.dropdown<InventoryRef>().subscribe({
      next: (items) => this.brandOptions.set(items.map((item) => ({ value: item.id, label: item.name }))),
      error: () => this.brandOptions.set([]),
    });
    if (this.id !== null) {
      this.loadProduct(this.id);
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const shelfLife = String(value.shelf_life_days ?? '').trim();
    const body: ProductPayload = {
      name: value.name.trim(),
      product_type: value.product_type,
      category: value.category,
      brand: value.brand,
      default_uom: value.default_uom.trim(),
      valuation_method: value.valuation_method,
      description: value.description.trim(),
      is_batch_tracked: value.is_batch_tracked,
      is_serial_tracked: value.is_serial_tracked,
      has_expiry: value.has_expiry,
      shelf_life_days: value.has_expiry && shelfLife ? Number(shelfLife) : null,
      is_active: value.is_active,
      is_purchasable: value.is_purchasable,
      is_sellable: value.is_sellable,
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, body) : this.api.create(body);
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
    void this.router.navigate(['/inventory/products']);
  }

  private loadProduct(id: number): void {
    this.loading.set(true);
    this.api.retrieve(id).subscribe({
      next: (product) => {
        this.form.patchValue({
          name: product.name,
          product_type: product.product_type,
          category: product.category?.id ?? null,
          brand: product.brand?.id ?? null,
          default_uom: product.default_uom,
          valuation_method: product.valuation_method,
          description: product.description ?? '',
          is_batch_tracked: product.is_batch_tracked,
          is_serial_tracked: product.is_serial_tracked,
          has_expiry: product.has_expiry,
          shelf_life_days: product.shelf_life_days === null ? '' : String(product.shelf_life_days),
          is_active: product.is_active,
          is_purchasable: product.is_purchasable,
          is_sellable: product.is_sellable,
        });
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
