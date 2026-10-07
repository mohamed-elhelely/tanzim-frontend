import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { API_BASE_URL } from '../api/api.config';

/** Adds `environment.apiHeaders` to requests for the API only (not to assets such as translation files). */
export const apiHeadersInterceptor: HttpInterceptorFn = (req, next) => {
  const headers = environment.apiHeaders;
  if (!req.url.startsWith(inject(API_BASE_URL)) || Object.keys(headers).length === 0) {
    return next(req);
  }
  return next(req.clone({ setHeaders: headers }));
};
