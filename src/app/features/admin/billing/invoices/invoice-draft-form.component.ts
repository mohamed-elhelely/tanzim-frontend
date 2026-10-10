import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { catchError, forkJoin, of } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../../core/errors/app-error';
import { NotificationService } from '../../../../core/services/notification.service';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { FormLayoutComponent } from '../../../../shared/components/form-layout/form-layout.component';
import { injectFormContext } from '../../../../shared/forms/form-context';
import { handleSaveError } from '../../../../shared/utils/server-errors';
import { TenantCompanyService } from '../../companies/tenant-company.service';
import { InvoiceDraftPayload, MONEY } from '../platform-billing.models';
import { AdminInvoiceService, SubscriptionService } from '../platform-billing.service';

/** A new draft platform invoice for one subscription; opens the invoice to add its items. */
@Component({
  selector: 'app-invoice-draft-form',
  imports: [ReactiveFormsModule, TranslatePipe, ButtonModule, InputTextModule, SelectModule, TextareaModule, FormLayoutComponent, FieldErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-draft-form.component.html',
})
export class InvoiceDraftFormComponent implements OnInit {
  private readonly api = inject(AdminInvoiceService);
  private readonly subscriptions = inject(SubscriptionService);
  private readonly companies = inject(TenantCompanyService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly ctx = injectFormContext(['/admin/billing/invoices']);

  readonly saving = signal(false);
  readonly formErrors = signal<string[]>([]);
  readonly subscriptionOptions = signal<Array<{ value: number; label: string }>>([]);
  /** False until the backend lets staff list every company's subscriptions (BACKEND_REQUESTS item 30). */
  readonly hasSubscriptions = signal(true);

  readonly form = inject(NonNullableFormBuilder).group({
    subscription: [null as number | null, [Validators.required]],
    due_date: [''],
    tax_rate: ['', [Validators.pattern(MONEY)]],
    discount: ['', [Validators.pattern(MONEY)]],
    notes: [''],
  });

  ngOnInit(): void {
    forkJoin({
      companies: this.companies.all().pipe(catchError(() => of([]))),
      subscriptions: this.subscriptions.all(),
    }).subscribe({
      next: ({ companies, subscriptions }) => {
        const names = new Map(companies.map((company) => [company.id, company.name]));
        this.hasSubscriptions.set(subscriptions.length > 0);
        this.subscriptionOptions.set(
          subscriptions.map((s) => ({
            value: s.id,
            label: `${s.company_name || names.get(s.company) || '#' + s.company} — ${s.plan_name}`,
          })),
        );
      },
      error: () => this.hasSubscriptions.set(false),
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body: InvoiceDraftPayload = { subscription: value.subscription as number };
    if (value.due_date) {
      body.due_date = value.due_date;
    }
    if (value.tax_rate) {
      body.tax_rate = value.tax_rate;
    }
    if (value.discount) {
      body.discount = value.discount;
    }
    if (value.notes.trim()) {
      body.notes = value.notes.trim();
    }
    this.saving.set(true);
    this.formErrors.set([]);
    this.api.createDraft(body).subscribe({
      next: (invoice) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant('admin.billing.invoices.draftCreated'));
        this.ctx.close(true);
        void this.router.navigate(['/admin/billing/invoices', invoice.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    this.ctx.close(false);
  }
}
