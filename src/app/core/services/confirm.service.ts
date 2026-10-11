import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { Observable, catchError, concatMap, from, map, of, toArray } from 'rxjs';
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
  /** Called when the user dismisses the question, e.g. to switch a toggle back. */
  onCancel?: () => void;
  /** Called when the action fails (the message is already shown). */
  onError?: (error: AppError) => void;
}

export interface ConfirmBulkOptions<T> {
  rows: T[];
  /** Translation key of the question; gets `{ count }`. */
  message: string;
  /** Translation key of the accept button. */
  accept: string;
  /** Translation key of the success toast; gets `{ count }` (how many succeeded). */
  success: string;
  danger?: boolean;
  run: (row: T) => Observable<unknown>;
  /** Gets the number that succeeded; runs whenever anything was attempted, usually a reload. */
  onDone: (succeeded: number) => void;
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

  /**
   * Asks "Delete {count} items?", then deletes them one at a time (so one refusal doesn't stop the rest) and
   * reports the outcome: "Deleted n", plus how many the backend refused and its first reason (e.g. "still used
   * by …"). `onDone` gets the number deleted and runs whenever anything was attempted, usually a reload.
   */
  confirmBulkDelete<T>(rows: T[], remove: (row: T) => Observable<unknown>, onDone: (deleted: number) => void): void {
    this.confirmBulk({
      rows,
      message: 'common.confirmBulkDelete',
      accept: 'common.delete',
      success: 'common.bulkDeleted',
      danger: true,
      run: remove,
      onDone,
    });
  }

  /**
   * The same flow for any action on several rows (e.g. confirm the ticked draft orders): ask once, run the
   * action row by row, then report how many succeeded and why the others failed.
   */
  confirmBulk<T>(options: ConfirmBulkOptions<T>): void {
    const { rows } = options;
    if (!rows.length) {
      return;
    }
    this.confirmation.confirm({
      key: CONFIRM_DIALOG_KEY,
      header: this.translate.instant('common.confirm'),
      message: this.translate.instant(options.message, { count: rows.length }),
      icon: options.danger ? 'pi pi-exclamation-triangle' : 'pi pi-question-circle',
      acceptLabel: this.translate.instant(options.accept),
      rejectLabel: this.translate.instant('common.cancel'),
      acceptButtonStyleClass: options.danger ? 'p-button-danger' : undefined,
      accept: () =>
        from(rows)
          .pipe(
            concatMap((row) =>
              options.run(row).pipe(
                map(() => null),
                catchError((error: AppError) => of(error)),
              ),
            ),
            toArray(),
          )
          .subscribe((results) => {
            const failures = results.filter((result): result is AppError => result !== null);
            const succeeded = results.length - failures.length;
            if (succeeded) {
              this.notifications.success(this.translate.instant(options.success, { count: succeeded }));
            }
            if (failures.length) {
              const reason = failures.find((error) => error.status >= 400 && error.status < 500)?.message ?? '';
              this.notifications.error(this.translate.instant('common.bulkFailed', { count: failures.length, reason }));
            }
            options.onDone(succeeded);
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
      accept: () => this.runAction(options.run, options.success, options.onDone, options.onError),
      reject: () => options.onCancel?.(),
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
