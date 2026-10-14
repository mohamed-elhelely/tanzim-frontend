import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '../models/api-response.model';

/** The one error shape the app works with; built from the backend's error envelope by toAppError(). */
export interface AppError {
  status: number;
  message: string;
  errors: Record<string, string[]>;
  /** The backend's `X-Request-ID` for this response: shown as a support code so a failure can be traced. */
  requestId?: string;
  raw?: unknown;
}

/** Turns any thrown value (HttpErrorResponse or not) into an AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof HttpErrorResponse) {
    const requestId = error.headers?.get('X-Request-ID') ?? undefined;
    const body = error.error as Partial<ApiErrorResponse> | string | null;
    if (body && typeof body === 'object' && body.error) {
      return {
        status: error.status,
        message: body.error.message,
        errors: body.error.errors ?? {},
        ...(requestId ? { requestId } : {}),
        raw: error,
      };
    }
    // DRF's plain `{ "detail": "…" }` (some actions answer outside the envelope).
    const detail = body && typeof body === 'object' ? (body as { detail?: unknown }).detail : undefined;
    return {
      status: error.status,
      message: typeof detail === 'string' ? detail : error.message,
      errors: {},
      ...(requestId ? { requestId } : {}),
      raw: error,
    };
  }

  return {
    status: 0,
    message: error instanceof Error ? error.message : String(error),
    errors: {},
    raw: error,
  };
}
