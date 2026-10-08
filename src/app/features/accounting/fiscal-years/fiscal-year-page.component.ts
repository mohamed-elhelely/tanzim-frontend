import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { FiscalPeriod, FiscalYear } from '../accounting.models';
import { FiscalYearService } from './fiscal-year.service';

/**
 * Fiscal years and their monthly periods on one page. Closing a period stops posting into it; closing the year
 * closes its periods and posts the closing entry to retained earnings. The backend enforces the order rules
 * (not before the end date, earlier years first) and its messages are shown as they come.
 */
@Component({
  selector: 'app-fiscal-year-page',
  imports: [
    DatePipe,
    FormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './fiscal-year-page.component.html',
})
export class FiscalYearPageComponent implements OnInit {
  private readonly api = inject(FiscalYearService);
  private readonly confirm = inject(ConfirmService);

  readonly years = signal<FiscalYear[]>([]);
  readonly loading = signal(true);
  readonly error = signal<AppError | null>(null);
  readonly dialogOpen = signal(false);
  readonly saving = signal(false);
  readonly dialogError = signal<string | null>(null);
  newYear = { name: '', start_date: '', end_date: '' };
  readonly errorTitleKey = errorTitleKey;

  readonly headerActions: PageHeaderAction[] = [
    { label: 'accounting.years.new', icon: 'pi pi-plus', onClick: () => this.openNew() },
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.all().subscribe({
      next: (years) => {
        this.years.set(years);
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.error.set(error);
        this.loading.set(false);
      },
    });
  }

  createYear(): void {
    const { name, start_date, end_date } = this.newYear;
    if (!start_date || !end_date || end_date <= start_date) {
      this.dialogError.set('accounting.hints.yearDates');
      return;
    }
    this.dialogError.set(null);
    this.saving.set(true);
    this.confirm.runAction(
      () => this.api.create({ name: name.trim(), start_date, end_date }),
      'accounting.toasts.yearCreated',
      () => {
        this.saving.set(false);
        this.dialogOpen.set(false);
        this.load();
      },
      () => this.saving.set(false),
    );
  }

  closeYear(year: FiscalYear): void {
    this.confirm.confirmAction({
      message: 'accounting.confirm.closeYear',
      params: { name: year.name },
      accept: 'accounting.actions.closeYear',
      success: 'accounting.toasts.yearClosed',
      danger: true,
      run: () => this.api.close(year.id),
      onDone: () => this.load(),
    });
  }

  reopenYear(year: FiscalYear): void {
    this.confirm.confirmAction({
      message: 'accounting.confirm.reopenYear',
      params: { name: year.name },
      accept: 'accounting.actions.reopen',
      success: 'accounting.toasts.reopened',
      run: () => this.api.reopen(year.id),
      onDone: () => this.load(),
    });
  }

  deleteYear(year: FiscalYear): void {
    this.confirm.confirmDelete(year.name, () => this.api.remove(year.id), () => this.load());
  }

  togglePeriod(period: FiscalPeriod): void {
    const closing = period.status === 'open';
    this.confirm.confirmAction({
      message: closing ? 'accounting.confirm.closePeriod' : 'accounting.confirm.reopenPeriod',
      params: { name: period.name },
      accept: closing ? 'accounting.actions.closePeriod' : 'accounting.actions.reopen',
      success: closing ? 'accounting.toasts.periodClosed' : 'accounting.toasts.reopened',
      run: () => (closing ? this.api.closePeriod(period.id) : this.api.reopenPeriod(period.id)),
      onDone: () => this.load(),
    });
  }

  private openNew(): void {
    // Suggest the calendar year after the latest one (or this year).
    const latest = this.years().reduce<string | null>((max, year) => (max && max > year.end_date ? max : year.end_date), null);
    const startYear = latest ? Number(latest.slice(0, 4)) + 1 : new Date().getFullYear();
    this.newYear = { name: `FY${startYear}`, start_date: `${startYear}-01-01`, end_date: `${startYear}-12-31` };
    this.dialogError.set(null);
    this.dialogOpen.set(true);
  }
}
