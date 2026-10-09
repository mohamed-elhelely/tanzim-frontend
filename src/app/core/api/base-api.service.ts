import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { API_BASE_URL } from './api.config';
import { ApiResponse } from '../models/api-response.model';

export interface RequestOptions {
  params?: HttpParams | Record<string, string | number | boolean | ReadonlyArray<string | number | boolean>>;
  headers?: Record<string, string>;
}

/**
 * Thin HttpClient wrapper: prefixes API_BASE_URL and types the backend envelope ({ success, data, metadata }).
 * Errors are already converted to AppError by the error interceptor. Resource services extend CrudApi instead.
 */
@Injectable({ providedIn: 'root' })
export class BaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  protected get<T>(path: string, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.http
      .get<ApiResponse<T>>(this.buildUrl(path), options)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  protected post<T>(path: string, body?: unknown, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.http
      .post<ApiResponse<T>>(this.buildUrl(path), body ?? {}, options)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  protected put<T>(path: string, body?: unknown, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.http
      .put<ApiResponse<T>>(this.buildUrl(path), body ?? {}, options)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  protected patch<T>(path: string, body?: unknown, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.http
      .patch<ApiResponse<T>>(this.buildUrl(path), body ?? {}, options)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  protected delete<T>(path: string, options?: RequestOptions): Observable<ApiResponse<T>> {
    return this.http
      .delete<ApiResponse<T>>(this.buildUrl(path), options)
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /** A file response (e.g. `?export=xlsx`), not wrapped in the envelope. */
  protected getBlob(path: string, options?: RequestOptions): Observable<Blob> {
    return this.http
      .get(this.buildUrl(path), { ...options, responseType: 'blob' })
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  /** A file returned by a POST (e.g. an import template). */
  protected postBlob(path: string, body?: unknown, options?: RequestOptions): Observable<Blob> {
    return this.http
      .post(this.buildUrl(path), body ?? {}, { ...options, responseType: 'blob' })
      .pipe(catchError((error: HttpErrorResponse) => this.handleError(error)));
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path.replace(/^\/+/, '')}`;
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}
