import { HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { catchError, throwError } from 'rxjs';
import { toAppError } from '../errors/app-error';
import { NotificationService } from '../services/notification.service';

const NETWORK_ERROR_STATUS = 0;
const SERVER_ERROR_MIN_STATUS = 500;

/** Converts every HTTP error to AppError and toasts network and 5xx errors, so screens only handle 4xx. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);

  return next(req).pipe(
    catchError((error: unknown) => {
      const appError = toAppError(error);

      if (appError.status === NETWORK_ERROR_STATUS || appError.status >= SERVER_ERROR_MIN_STATUS) {
        const messageKey = appError.status === NETWORK_ERROR_STATUS ? 'errors.network' : 'errors.server';
        injector.get(NotificationService).error(injector.get(TranslateService).instant(messageKey));
      }

      return throwError(() => appError);
    }),
  );
};
