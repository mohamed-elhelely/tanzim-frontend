import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Injector, inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { AppError } from '../errors/app-error';

const UNAUTHORIZED = 401;
const RETRIED = new HttpContextToken<boolean>(() => false);

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/login/') || url.includes('/api/refresh/');
}

function statusOf(error: unknown): number | null {
  if (error instanceof HttpErrorResponse) {
    return error.status;
  }
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as AppError).status;
    return typeof status === 'number' ? status : null;
  }
  return null;
}

/**
 * Adds the Bearer token. On a 401 it refreshes the access token once (shared between parallel requests,
 * see AuthService.refreshAccessToken) and retries; if there is no refresh token, the refresh fails, or the
 * retry is still 401, it logs out. Login and refresh calls pass through untouched.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const injector = inject(Injector);
  const tokens = inject(TokenStorageService);

  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  const token = tokens.accessToken();
  const authorized = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authorized).pipe(
    catchError((error: unknown) => {
      if (statusOf(error) !== UNAUTHORIZED || req.context.get(RETRIED)) {
        return throwError(() => error);
      }

      const auth = injector.get(AuthService);
      if (!tokens.refreshToken()) {
        auth.logout();
        return throwError(() => error);
      }

      return auth.refreshAccessToken().pipe(
        catchError((refreshError: unknown) => {
          auth.logout();
          return throwError(() => refreshError);
        }),
        switchMap((accessToken) =>
          next(
            req.clone({
              setHeaders: { Authorization: `Bearer ${accessToken}` },
              context: req.context.set(RETRIED, true),
            }),
          ).pipe(
            catchError((retryError: unknown) => {
              // A fresh token was still rejected: the session is no longer valid.
              if (statusOf(retryError) === UNAUTHORIZED) {
                auth.logout();
              }
              return throwError(() => retryError);
            }),
          ),
        ),
      );
    }),
  );
};
