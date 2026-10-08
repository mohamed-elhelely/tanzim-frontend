import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { saveFile } from '../../../shared/utils/save-file';
import { InventoryRef } from '../../inventory/inventory.models';
import { SupplierService } from '../../inventory/suppliers/supplier.service';
import { CustomerService } from '../../sales/customers/customer.service';
import { AccountService } from '../accounts/account.service';
import { REPORT_PARAMS, REPORT_TYPES, ReportParam, ReportResult, ReportType, ReportValue } from '../accounting.models';
import { AccountingReportService } from './accounting-report.service';

/** Columns and summary keys that hold text or dates; everything else numeric is shown as money. */
const TEXT_KEYS = new Set([
  'code',
  'name',
  'account_type',
  'section',
  'date',
  'entry_number',
  'description',
  'reference',
  'customer',
  'supplier',
  'account',
  'start_date',
  'end_date',
  'as_of_date',
]);

interface Option {
  value: number;
  label: string;
}

/**
 * The eight accounting reports in one screen: pick a report, fill its parameters (from REPORT_PARAMS), run it, and
 * read the rows and summary, or download the same report as Excel.
 */
@Component({
  selector: 'app-report-viewer',
  imports: [
    DecimalPipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    TableModule,
    PageHeaderComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './report-viewer.component.html',
})
export class ReportViewerComponent implements OnInit {
  private readonly api = inject(AccountingReportService);
  private readonly accountsApi = inject(AccountService);
  private readonly customersApi = inject(CustomerService);
  private readonly suppliersApi = inject(SupplierService);
  private readonly notifications = inject(NotificationService);

  readonly type = signal<ReportType>('trial_balance');
  params: Partial<Record<ReportParam, string | number | null>> = {};
  readonly result = signal<ReportResult | null>(null);
  readonly running = signal(false);
  readonly exporting = signal(false);
  readonly error = signal<AppError | null>(null);
  readonly missingParam = signal<ReportParam | null>(null);
  readonly accounts = signal<Option[]>([]);
  readonly customers = signal<Option[]>([]);
  readonly suppliers = signal<Option[]>([]);
  readonly typeOptions = REPORT_TYPES.map((type) => ({ value: type, label: `accounting.reports.${type}` }));

  readonly fields = computed(() => REPORT_PARAMS[this.type()]);
  /** Summary entries worth showing (no empty dates, no labels the table already shows). */
  readonly summary = computed(() =>
    Object.entries(this.result()?.summary ?? {}).filter(([, value]) => value !== null && value !== ''),
  );

  ngOnInit(): void {
    // Pickers for the statements; a failure (e.g. no inventory module for suppliers) only empties that picker.
    this.accountsApi.all().subscribe({
      next: (accounts) => this.accounts.set(accounts.map((a) => ({ value: a.id, label: `${a.code} ${a.name}` }))),
      error: () => undefined,
    });
    this.customersApi.all().subscribe({
      next: (customers) => this.customers.set(customers.map((c) => ({ value: c.id, label: c.name }))),
      error: () => undefined,
    });
    this.suppliersApi.dropdown<InventoryRef>().subscribe({
      next: (suppliers) => this.suppliers.set(suppliers.map((s) => ({ value: s.id, label: s.name }))),
      error: () => undefined,
    });
    this.run();
  }

  onTypeChange(type: ReportType): void {
    this.type.set(type);
    this.result.set(null);
    this.error.set(null);
    this.missingParam.set(null);
    // Run right away when nothing is required.
    if (!this.requiredParam()) {
      this.run();
    }
  }

  run(): void {
    const missing = this.requiredParam();
    this.missingParam.set(missing);
    if (missing) {
      return;
    }
    this.running.set(true);
    this.error.set(null);
    this.api.run(this.type(), this.query()).subscribe({
      next: (result) => {
        this.result.set(result);
        this.running.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.running.set(false);
      },
    });
  }

  exportXlsx(): void {
    if (this.requiredParam()) {
      this.missingParam.set(this.requiredParam());
      return;
    }
    this.exporting.set(true);
    this.api.exportXlsx(this.type(), this.query()).subscribe({
      next: (blob) => {
        this.exporting.set(false);
        saveFile(blob, `${this.type()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      },
      error: (error: AppError) => {
        this.exporting.set(false);
        if (error.status >= 400 && error.status < 500) {
          this.notifications.error(error.message);
        }
      },
    });
  }

  isText(key: string): boolean {
    return TEXT_KEYS.has(key);
  }

  isNumber(value: ReportValue): value is number {
    return typeof value === 'number';
  }

  /** account_type / section values are account types; show them translated. */
  isAccountType(key: string): boolean {
    return key === 'account_type' || key === 'section';
  }

  private requiredParam(): ReportParam | null {
    const required = this.fields().find((field) => field === 'account' || field === 'customer' || field === 'supplier');
    return required && !this.params[required] ? required : null;
  }

  private query(): Record<string, string> {
    const query: Record<string, string> = {};
    for (const field of this.fields()) {
      const value = this.params[field];
      if (value !== null && value !== undefined && value !== '') {
        query[field] = String(value);
      }
    }
    return query;
  }
}
