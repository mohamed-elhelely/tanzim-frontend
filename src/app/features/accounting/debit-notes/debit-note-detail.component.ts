import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { CardModule } from 'primeng/card';
import { AppError } from '../../../core/errors/app-error';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ErrorStateComponent } from '../../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../../shared/components/loading-state/loading-state.component';
import { PageHeaderAction, PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ReasonDialogComponent } from '../../../shared/components/reason-dialog/reason-dialog.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { errorTitleKey } from '../../../shared/utils/server-errors';
import { DEBIT_NOTE_SEVERITY, DebitNote } from '../accounting.models';
import { DebitNoteService } from './debit-note.service';

/** One debit note. Drafts: edit, issue (posts it), delete. Issued: cancel with a reason. */
@Component({
  selector: 'app-debit-note-detail',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    TranslatePipe,
    CardModule,
    PageHeaderComponent,
    LoadingStateComponent,
    ErrorStateComponent,
    ReasonDialogComponent,
    StatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './debit-note-detail.component.html',
})
export class DebitNoteDetailComponent implements OnInit {
  private readonly api = inject(DebitNoteService);
  private readonly router = inject(Router);
  private readonly confirm = inject(ConfirmService);

  readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  readonly note = signal<DebitNote | null>(null);
  readonly loadError = signal<AppError | null>(null);
  readonly cancelDialogOpen = signal(false);
  readonly errorTitleKey = errorTitleKey;
  readonly statusSeverity = DEBIT_NOTE_SEVERITY;

  readonly actions = computed<PageHeaderAction[]>(() => {
    switch (this.note()?.status) {
      case 'draft':
        return [
          { label: 'common.edit', icon: 'pi pi-pencil', severity: 'secondary', onClick: () => this.edit() },
          { label: 'accounting.actions.issue', icon: 'pi pi-send', onClick: () => this.issue() },
          { label: 'common.delete', icon: 'pi pi-trash', severity: 'secondary', onClick: () => this.remove() },
        ];
      case 'issued':
        return [{ label: 'accounting.actions.cancelNote', icon: 'pi pi-times', severity: 'danger', onClick: () => this.cancelDialogOpen.set(true) }];
      default:
        return [];
    }
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loadError.set(null);
    this.api.retrieve(this.id).subscribe({
      next: (note) => this.note.set(note),
      error: (error: AppError) => this.loadError.set(error),
    });
  }

  goBack(): void {
    void this.router.navigate(['/accounting/debit-notes']);
  }

  onCancelConfirmed(reason: string): void {
    this.confirm.runAction(
      () => this.api.cancel(this.id, reason),
      'accounting.toasts.noteCancelled',
      (note) => {
        this.cancelDialogOpen.set(false);
        this.note.set(note);
      },
    );
  }

  private edit(): void {
    void this.router.navigate(['/accounting/debit-notes', this.id, 'edit']);
  }

  private issue(): void {
    this.confirm.confirmAction({
      message: 'accounting.confirm.issueNote',
      accept: 'accounting.actions.issue',
      success: 'accounting.toasts.noteIssued',
      run: () => this.api.issue(this.id),
      onDone: (note) => this.note.set(note),
    });
  }

  private remove(): void {
    this.confirm.confirmDelete(this.note()?.note_number ?? '', () => this.api.remove(this.id), () => this.goBack());
  }
}
