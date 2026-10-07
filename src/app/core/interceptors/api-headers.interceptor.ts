import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { API_BASE_URL } from '../api/api.config';

/**
 * Headers every backend request needs. The production API runs behind ngrok, which answers
 * browser requests with an HTML warning page unless this header is present.
 * Only API requests get it, so loading the app's own files (e.g. translations) stays a simple request.
 */
export const apiHeadersInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(inject(API_BASE_URL))) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'ngrok-skip-browser-warning': 'true' } }));
};
