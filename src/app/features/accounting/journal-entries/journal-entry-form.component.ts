import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { forkJoin, of } from 'rxjs';
import { AppError } from '../../../core/errors/app-error';
import { NotificationService } from '../../../core/services/notification.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { errorTitleKey, handleSaveError } from '../../../shared/utils/server-errors';
import { AccountService } from '../accounts/account.service';
import { Account, JournalEntry, JournalEntryPayload } from '../accounting.models';
import { JournalEntryService } from './journal-entry.service';

const MONEY = /^\d+(\.\d{1,2})?$/;

type LineForm = FormGroup<{
  account: FormControl<number | null>;
  debit: FormControl<string>;
  credit: FormControl<string>;
  description: FormControl<string>;
}>;

/** Exactly one of debit / credit is filled (the backend's rule). */
function oneSide(group: AbstractControl): ValidationErrors | null {
  const debit = Number(group.get('debit')?.value) || 0;
  const credit = Number(group.get('credit')?.value) || 0;
  return (debit > 0) === (credit > 0) ? { oneSide: true } : null;
}

/** Today as YYYY-MM-DD in the user's time zone (what <input type="date"> uses). */
function today(): string {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Cents as integers so 0.1 + 0.2 compares equal to 0.3. */
function cents(value: string | undefined): number {
  return Math.round((Number(value) || 0) * 100);
}

/**
 * A manual journal entry: date, description, reference and at least two lines that balance. "Save as draft" keeps
 * it editable; "Save and post" posts it in the same request. Only drafts can be edited.
 */
@Component({
  selector: 'app-journal-entry-form',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    TranslatePipe,
    ButtonModule,
    CardModule,
    InputTextModule,
    SelectModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    FieldErrorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-entry-form.component.html',
})
export class JournalEntryFormComponent implements OnInit {
  private readonly api = inject(JournalEntryService);
  private readonly accountsApi = inject(AccountService);
  private readonly router = inject(Router);
  private readonly notifications = inject(NotificationService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;
  readonly isEdit = this.id !== null;
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<AppError | null>(null);
  readonly notDraft = signal(false);
  readonly formErrors = signal<string[]>([]);
  /** Set by the first save attempt; the balance message then follows the totals as the user fixes them. */
  readonly submitted = signal(false);
  /** Only active posting (non-group) accounts can take lines. */
  readonly accountOptions = signal<{ value: number; label: string }[]>([]);
  readonly errorTitleKey = errorTitleKey;

  readonly form = this.fb.group({
    date: [today(), Validators.required],
    description: ['', [Validators.maxLength(255)]],
    reference: ['', [Validators.maxLength(100)]],
    lines: this.fb.array<LineForm>([]),
  });

  private readonly value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly totals = computed(() => {
    const lines = this.value().lines ?? [];
    const debit = lines.reduce((sum, line) => sum + cents(line.debit), 0);
    const credit = lines.reduce((sum, line) => sum + cents(line.credit), 0);
    return { debit: debit / 100, credit: credit / 100, difference: (debit - credit) / 100, balanced: debit === credit && debit > 0 };
  });

  readonly balanceError = computed(() => this.submitted() && !(this.totals().balanced && (this.value().lines?.length ?? 0) >= 2));

  get lines(): FormArray<LineForm> {
    return this.form.controls.lines;
  }

  ngOnInit(): void {
    forkJoin({
      accounts: this.accountsApi.all(),
      entry: this.id !== null ? this.api.retrieve(this.id) : of(null),
    }).subscribe({
      next: ({ accounts, entry }) => {
        this.accountOptions.set(toOptions(accounts, entry));
        if (entry && entry.status !== 'draft') {
          this.notDraft.set(true);
        } else if (entry) {
          this.form.patchValue({ date: entry.date, description: entry.description, reference: entry.reference });
          entry.lines.forEach((line) =>
            this.addLine({ account: line.account, debit: trim(line.debit), credit: trim(line.credit), description: line.description }),
          );
        } else {
          this.addLine();
          this.addLine();
        }
        this.loading.set(false);
      },
      error: (error: AppError) => {
        this.loadError.set(error);
        this.loading.set(false);
      },
    });
  }

  addLine(line?: { account: number; debit: string; credit: string; description: string }): void {
    this.lines.push(
      this.fb.group(
        {
          account: this.fb.control<number | null>(line?.account ?? null, Validators.required),
          debit: [line?.debit ?? '', [Validators.pattern(MONEY)]],
          credit: [line?.credit ?? '', [Validators.pattern(MONEY)]],
          description: [line?.description ?? '', [Validators.maxLength(255)]],
        },
        { validators: oneSide },
      ),
    );
  }

  removeLine(index: number): void {
    this.lines.removeAt(index);
  }

  /** Puts the remaining difference on the last line, on the side that balances the entry. */
  balanceLastLine(): void {
    const last = this.lines.at(this.lines.length - 1);
    if (!last) {
      return;
    }
    const others = this.lines.controls.slice(0, -1);
    const diff = others.reduce((sum, line) => sum + cents(line.value.debit) - cents(line.value.credit), 0);
    last.patchValue(diff > 0 ? { debit: '', credit: (diff / 100).toFixed(2) } : { debit: (-diff / 100).toFixed(2), credit: '' });
  }

  submit(post: boolean): void {
    this.form.markAllAsTouched();
    this.submitted.set(true);
    if (this.form.invalid || this.balanceError() || this.saving()) {
      return;
    }
    const value = this.form.getRawValue();
    const payload: JournalEntryPayload = {
      date: value.date,
      description: value.description.trim(),
      reference: value.reference.trim(),
      post,
      lines: value.lines.map((line) => ({
        account: line.account as number,
        debit: line.debit.trim() || '0',
        credit: line.credit.trim() || '0',
        description: line.description.trim(),
      })),
    };
    this.saving.set(true);
    this.formErrors.set([]);
    const request = this.id !== null ? this.api.update(this.id, payload) : this.api.create(payload);
    request.subscribe({
      next: (entry) => {
        this.saving.set(false);
        this.notifications.success(this.translate.instant(post ? 'accounting.toasts.posted' : 'common.saved'));
        void this.router.navigate(['/accounting/journal-entries', entry.id]);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.formErrors.set(handleSaveError(this.form, error, this.notifications));
      },
    });
  }

  goBack(): void {
    void this.router.navigate(this.id !== null ? ['/accounting/journal-entries', this.id] : ['/accounting/journal-entries']);
  }
}

/** Active posting accounts, plus any inactive one an existing draft already uses (so it still shows). */
function toOptions(accounts: Account[], entry: JournalEntry | null): { value: number; label: string }[] {
  const used = new Set(entry?.lines.map((line) => line.account) ?? []);
  return accounts
    .filter((account) => !account.is_group && (account.is_active || used.has(account.id)))
    .map((account) => ({ value: account.id, label: `${account.code} ${account.name}` }));
}

/** "125.00" → "125", "0.00" → "" so empty sides stay empty. */
function trim(value: string): string {
  const number = Number(value);
  return number ? String(number) : '';
}
