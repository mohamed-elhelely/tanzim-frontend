import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { JournalEntry } from '../accounting.models';
import { JournalEntryService } from './journal-entry.service';

/**
 * One journal entry. Drafts can be edited, posted or deleted; posted entries are final and can only be reversed
 * (once, and not a reversal itself). Follows the route param because reversing opens the new entry.
 */
@Component({
  selector: 'app-journal-entry-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    TranslatePipe,
    ButtonModule,
    CardModule,
    DialogModule,
    InputTextModule,
    TableModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './journal-entry-detail.component.html',
})
export class JournalEntryDetailComponent implements OnInit {
  private readonly api = inject(JournalEntryService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  id = 0;
  readonly entry = signal<JournalEntry | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly reverseDialogOpen = signal(false);
  readonly saving = signal(false);
  reverseDate = '';
  reverseDescription = '';
  readonly errorTitleKey = errorTitleKey;

  readonly actions = computed<PageHeaderAction[]>(() => {
    const entry = this.entry();
    if (!entry) {
      return [];
    }
    if (entry.status === 'draft') {
      return [
        { label: 'common.edit', icon: 'pi pi-pencil', severity: 'secondary', onClick: () => this.edit() },
        { label: 'accounting.actions.post', icon: 'pi pi-check', onClick: () => this.postEntry() },
        { label: 'common.delete', icon: 'pi pi-trash', severity: 'secondary', onClick: () => this.remove() },
      ];
    }
    if (!entry.reversed_by && !entry.reversal_of) {
      return [{ label: 'accounting.actions.reverse', icon: 'pi pi-undo', severity: 'secondary', onClick: () => this.openReverse() }];
    }
    return [];
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.id = Number(params.get('id'));
      this.entry.set(null);
      this.load();
    });
  }

  load(): void {
    this.loadError.set(null);
    this.api.retrieve(this.id).subscribe({
      next: (entry) => this.entry.set(entry),
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/accounting/journal-entries']);
  }

  submitReverse(): void {
    this.saving.set(true);
    this.confirm.runAction(
      () => this.api.reverse(this.id, this.reverseDate || null, this.reverseDescription.trim()),
      'accounting.toasts.reversed',
      (reversal) => {
        this.saving.set(false);
        this.reverseDialogOpen.set(false);
        void this.router.navigate(['/accounting/journal-entries', reversal.id]);
      },
      () => this.saving.set(false),
    );
  }

  private edit(): void {
    void this.router.navigate(['/accounting/journal-entries', this.id, 'edit']);
  }

  private postEntry(): void {
    this.confirm.confirmAction({
      message: 'accounting.confirm.post',
      accept: 'accounting.actions.post',
      success: 'accounting.toasts.posted',
      run: () => this.api.postEntry(this.id),
      onDone: (entry) => this.entry.set(entry),
    });
  }

  private openReverse(): void {
    this.reverseDate = '';
    this.reverseDescription = '';
    this.reverseDialogOpen.set(true);
  }

  private remove(): void {
    this.confirm.confirmDelete(this.entry()?.entry_number ?? '', () => this.api.remove(this.id), () => this.goBack());
  }
}
