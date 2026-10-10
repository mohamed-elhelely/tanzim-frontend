import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TextareaModule } from 'primeng/textarea';
import { AppError } from '../../../../core/errors/app-error';
import { ConfirmService } from '../../../../core/services/confirm.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ReasonDialogComponent } from '../../../../shared/components/reason-dialog/reason-dialog.component';
import { StatusBadgeComponent } from '../../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey, handleSaveError } from '../../../../shared/utils/server-errors';
import { InvoiceItem } from '../../../billing/billing.models';
import { AdminInvoice, BillingModule, INVOICE_SEVERITY, MONEY, WHOLE } from '../platform-billing.models';
import { AdminInvoiceService, BillingModuleService } from '../platform-billing.service';

/**
 * /admin/invoices/:id: one platform invoice. While it is a draft, staff edit its items and issue it; once issued,
 * they record payments (or mark it paid) and can cancel it. The backend's `can_*` flags decide every button.
 */
@Component({
  selector: 'app-invoice-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TextareaModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    FieldErrorComponent,
    ReasonDialogComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './invoice-detail.component.html',
})
export class InvoiceDetailComponent implements OnInit {
  private readonly api = inject(AdminInvoiceService);
  private readonly modulesApi = inject(BillingModuleService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly notifications = inject(NotificationService);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));

  readonly invoice = signal<AdminInvoice | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly errorTitleKey = errorTitleKey;
  readonly severity = INVOICE_SEVERITY;
  readonly moduleOptions = signal<Array<{ value: number; label: string }>>([]);

  /** Item dialog: null = closed, 'new' = add, an item = edit. */
  readonly editingItem = signal<InvoiceItem | 'new' | null>(null);
  readonly itemSaving = signal(false);
  readonly itemErrors = signal<string[]>([]);
  readonly itemForm = this.fb.group({
    description: ['', [Validators.required, Validators.maxLength(255)]],
    quantity: ['1', [Validators.required, Validators.pattern(WHOLE)]],
    unit_price: ['', [Validators.required, Validators.pattern(MONEY)]],
    module: [null as number | null],
  });

  readonly paymentOpen = signal(false);
  readonly paymentSaving = signal(false);
  readonly paymentErrors = signal<string[]>([]);
  readonly paymentForm = this.fb.group({
    amount: ['', [Validators.required, Validators.pattern(MONEY)]],
    transaction_id: ['', [Validators.maxLength(100)]],
    notes: [''],
  });

  readonly cancelOpen = signal(false);

  readonly actions = computed<PageHeaderAction[]>(() => {
    const invoice = this.invoice();
    if (!invoice) {
      return [];
    }
    const actions: PageHeaderAction[] = [];
    if (invoice.status === 'draft') {
      actions.push({
        label: 'admin.billing.invoices.issue',
        icon: 'pi pi-send',
        disabled: invoice.items.length === 0,
        onClick: () => this.issue(),
      });
    }
    if (invoice.can_add_payment) {
      actions.push(
        { label: 'admin.billing.invoices.markPaid', icon: 'pi pi-check-circle', severity: 'secondary', onClick: () => this.markPaid() },
        { label: 'admin.billing.invoices.addPayment', icon: 'pi pi-wallet', onClick: () => this.openPayment() },
      );
    }
    if (invoice.can_cancel) {
      actions.push({ label: 'admin.billing.invoices.cancel', icon: 'pi pi-times', severity: 'danger', onClick: () => this.cancelOpen.set(true) });
    }
    return actions;
  });

  ngOnInit(): void {
    this.load();
    this.modulesApi.all().subscribe({
      next: (modules: BillingModule[]) => this.moduleOptions.set(modules.map((module) => ({ value: module.id, label: module.name }))),
      error: () => this.moduleOptions.set([]),
    });
  }

  load(): void {
    this.loadError.set(null);
    this.api.retrieve(this.id).subscribe({
      next: (invoice) => this.invoice.set(invoice),
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/admin/billing/invoices']);
  }

  openItem(item: InvoiceItem | 'new'): void {
    this.itemErrors.set([]);
    this.itemForm.reset(
      item === 'new'
        ? { description: '', quantity: '1', unit_price: '', module: null }
        : { description: item.description, quantity: String(item.quantity), unit_price: item.unit_price, module: null },
    );
    this.editingItem.set(item);
  }

  saveItem(): void {
    const editing = this.editingItem();
    if (!editing || this.itemForm.invalid || this.itemSaving()) {
      this.itemForm.markAllAsTouched();
      return;
    }
    const value = this.itemForm.getRawValue();
    const body = { description: value.description.trim(), quantity: Number(value.quantity), unit_price: value.unit_price };
    const request =
      editing === 'new'
        ? this.api.addItem(this.id, { ...body, ...(value.module ? { module: value.module } : {}) })
        : this.api.updateItem(this.id, editing.id, body);
    this.itemSaving.set(true);
    this.itemErrors.set([]);
    request.subscribe({
      next: (invoice) => {
        this.itemSaving.set(false);
        this.invoice.set(invoice);
        this.editingItem.set(null);
      },
      error: (error: AppError) => {
        this.itemSaving.set(false);
        this.itemErrors.set(handleSaveError(this.itemForm, error, this.notifications));
      },
    });
  }

  removeItem(item: InvoiceItem): void {
    this.confirm.confirmDelete(item.description, () => this.api.removeItem(this.id, item.id), () => this.load());
  }

  openPayment(): void {
    this.paymentErrors.set([]);
    this.paymentForm.reset({ amount: this.invoice()?.amount_due ?? '', transaction_id: '', notes: '' });
    this.paymentOpen.set(true);
  }

  savePayment(): void {
    if (this.paymentForm.invalid || this.paymentSaving()) {
      this.paymentForm.markAllAsTouched();
      return;
    }
    const value = this.paymentForm.getRawValue();
    this.paymentSaving.set(true);
    this.paymentErrors.set([]);
    this.api
      .addPayment(this.id, {
        amount: value.amount,
        ...(value.transaction_id.trim() ? { transaction_id: value.transaction_id.trim() } : {}),
        ...(value.notes.trim() ? { notes: value.notes.trim() } : {}),
      })
      .subscribe({
        next: (invoice) => {
          this.paymentSaving.set(false);
          this.invoice.set(invoice);
          this.paymentOpen.set(false);
        },
        error: (error: AppError) => {
          this.paymentSaving.set(false);
          this.paymentErrors.set(handleSaveError(this.paymentForm, error, this.notifications));
        },
      });
  }

  cancel(reason: string): void {
    this.confirm.runAction(
      () => this.api.cancel(this.id, reason),
      'admin.billing.invoices.cancelled',
      (invoice) => {
        this.invoice.set(invoice);
        this.cancelOpen.set(false);
      },
    );
  }

  private issue(): void {
    this.act('admin.billing.invoices.confirmIssue', 'admin.billing.invoices.issue', 'admin.billing.invoices.issued', () => this.api.issue(this.id));
  }

  private markPaid(): void {
    this.act('admin.billing.invoices.confirmMarkPaid', 'admin.billing.invoices.markPaid', 'admin.billing.invoices.paid', () =>
      this.api.markPaid(this.id),
    );
  }

  private act(message: string, accept: string, success: string, run: () => Observable<AdminInvoice>): void {
    const invoice = this.invoice();
    this.confirm.confirmAction({
      message,
      params: { number: invoice?.invoice_number, amount: invoice?.amount_due },
      accept,
      success,
      run,
      onDone: (updated) => this.invoice.set(updated),
    });
  }
}
