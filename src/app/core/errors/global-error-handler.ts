import { ErrorHandler, Injectable, Injector, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { toAppError } from './app-error';
import { NotificationService } from '../services/notification.service';

/** Last resort for uncaught errors. HTTP errors were already shown by the error interceptor, so only others get a toast. */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);

  handleError(error: unknown): void {
    const appError = toAppError(error);
    console.error('[GlobalErrorHandler]', appError.message, error);

    if (!(error instanceof HttpErrorResponse)) {
      const notifications = this.injector.get(NotificationService);
      const translate = this.injector.get(TranslateService);
      notifications.error(translate.instant('errors.unexpected'));
    }
  }
}
