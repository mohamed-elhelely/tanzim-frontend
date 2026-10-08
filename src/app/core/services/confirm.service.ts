import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';
import { AppError } from '../errors/app-error';
import { NotificationService } from './notification.service';

/** Key of the dialog hosted once in the shell (ConfirmDialogComponent). */
export const CONFIRM_DIALOG_KEY = 'app-confirm';

/** The confirm → delete → toast flow every list screen uses. */
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
          error: (error: AppError) => {
            if (error.status >= 400 && error.status < 500 && error.status !== 401) {
              this.notifications.error(error.message);
            }
          },
        }),
    });
  }
}
