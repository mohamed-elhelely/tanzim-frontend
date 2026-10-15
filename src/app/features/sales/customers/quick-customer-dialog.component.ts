import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputTextModule } from 'primeng/inputtext';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { handleSaveError } from '../../../shared/utils/server-errors';
import { CustomerService } from './customer.service';

/**
 * "Quick add customer" from the sales order form: just a name and a phone number, saved through the customers API.
 * Closes with the new customer (the order form selects it), or with nothing when cancelled.
 */
@Component({
  selector: 'app-quick-customer-dialog',
  imports: [ReactiveFormsModule, TranslatePipe, ButtonModule, InputTextModule, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-4" novalidate>
      @if (formErrors().length) {
        <div
          role="alert"
          class="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          @for (message of formErrors(); track $index) {
            <p>{{ message }}</p>
          }
        </div>
      }
      <div class="flex flex-col gap-1">
        <label for="quick_customer_name" class="text-sm font-medium">{{ 'sales.fields.name' | translate }} *</label>
        <input pInputText id="quick_customer_name" formControlName="name" class="w-full" autocomplete="off" />
        <app-field-error [control]="form.controls.name"></app-field-error>
      </div>
      <div class="flex flex-col gap-1">
        <label for="quick_customer_phone" class="text-sm font-medium">{{ 'sales.fields.phone' | translate }} *</label>
        <input pInputText id="quick_customer_phone" formControlName="phone" type="tel" dir="ltr" class="w-full" autocomplete="off" />
        <app-field-error [control]="form.controls.phone"></app-field-error>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <p-button
          type="button"
          [label]="'common.cancel' | translate"
          severity="secondary"
          [text]="true"
          [disabled]="saving()"
          (onClick)="cancel()"
        ></p-button>
        <p-button type="submit" [label]="'common.save' | translate" icon="pi pi-check" [loading]="saving()" [disabled]="saving()"></p-button>
      </div>
    </form>
  `,
})
export class QuickCustomerDialogComponent {
  private readonly api = inject(CustomerService);
  private readonly ref = inject(DynamicDialogRef);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);

  readonly saving = signal(false);
  readonly formErrors = signal<string[]>([]);
  // Same limits as the full customer form.
  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    phone: ['', [Validators.required, Validators.maxLength(50)]],
  });

  submit(): void {
    const value = this.form.getRawValue();
    // A name or phone of spaces only is still empty.
    if (!value.name.trim()) {
      this.form.controls.name.setValue('');
    }
    if (!value.phone.trim()) {
      this.form.controls.phone.setValue('');
    }
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formErrors.set([]);
    this.api.quickCreate({ name: value.name.trim(), phone: value.phone.trim() }).subscribe({
      next: (customer) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('sales.quickCustomer.created', { name: customer.name }));
        this.ref.close(customer);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  cancel(): void {
    this.ref.close();
  }
}
