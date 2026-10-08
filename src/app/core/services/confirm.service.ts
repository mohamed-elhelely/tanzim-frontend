import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';
import { AppError } from '../errors/app-error';
import { NotificationService } from './notification.service';

/** Key of the dialog hosted once in the shell (ConfirmDialogComponent). */
export const CONFIRM_DIALOG_KEY = 'app-confirm';

export interface ConfirmActionOptions<T> {
  /** Translation key of the question, e.g. 'sales.confirm.confirmOrder'. */
  message: string;
  params?: Record<string, unknown>;
  /** Translation key of the accept button. */
  accept: string;
  /** Translation key of the success toast. */
  success: string;
  danger?: boolean;
  run: () => Observable<T>;
  onDone: (result: T) => void;
}

/** The confirm → act → toast flows: deletes on list screens and workflow actions (confirm, ship, issue…). */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private readonly confirmation = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);
  private readonly notifications = inject(NotificationService);

  /**
   * Asks "Delete "{name}"?", then runs `remove`. On success it shows "Deleted" and calls `onDeleted`
   * (usually a list reload). A 4xx shows the backend's message; network and 5xx errors are already
   * shown by the error interceptor, and 401 by the auth interceptor.
   */
  confirmDelete(name: string, remove: () => Observable<unknown>, onDeleted: () => void): void {
    this.confirmation.confirm({
      key: CONFIRM_DIALOG_KEY,
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant('common.confirmDelete', { name }),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.delete'),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: 'p-button-danger',
      accept: () =>
        remove().subscribe({
          next: () => {
            this.notifications.success(this.translate.instant('common.deleted'));
            onDeleted();
          },
          error: (error: AppError) => this.showClientError(error),
        }),
    });
  }

  /** Asks the question, runs the action, then toasts success or the backend's 4xx message (like confirmDelete). */
  confirmAction<T>(options: ConfirmActionOptions<T>): void {
    this.confirmation.confirm({
      key: CONFIRM_DIALOG_KEY,
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant(options.message, options.params),
      icon: options.danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
      acceptLabel: this.translate.instant(options.accept),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: options.danger ? 'p-button-danger' : undefined,
      accept: () => this.runAction(options.run, options.success, options.onDone),
    });
  }

  /**
   * Runs an action without asking (e.g. after a dialog collected its input), with the same toasts.
   * `onError` lets a dialog stop its spinner; the message is already shown.
   */
  runAction<T>(run: () => Observable<T>, success: string, onDone: (result: T) => void, onError?: (error: AppError) => void): void {
    run().subscribe({
      next: (result) => {
        this.notifications.success(this.translate.instant(success));
        onDone(result);
      },
      error: (error: AppError) => {
        this.showClientError(error);
        onError?.(error);
      },
    });
  }

  private showClientError(error: AppError): void {
    if (error.status >= 400 && error.status < 500 && error.status !== 401) {
      this.notifications.error(error.message);
    }
  }
}
