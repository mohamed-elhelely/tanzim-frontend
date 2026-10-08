import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '../models/api-response.model';

/** The one error shape the app works with; built from the backend's error envelope by toAppError(). */
export interface AppError {
  status: number;
  message: string;
  errors: Record<string, string[]>;
  raw?: unknown;
}

/** Turns any thrown value (HttpErrorResponse or not) into an AppError. */
export function toAppError(error: unknown): AppError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiErrorResponse> | string | null;
    if (body && typeof body === 'object' && body.error) {
      return {
        status: error.status,
        message: unwrapDjangoMessage(body.error.message),
        errors: body.error.errors ?? {},
        raw: error,
      };
    }
    return { status: error.status, message: error.message, errors: {}, raw: error };
  }

  return {
    status: 0,
    message: error instanceof Error ? error.message : String(error),
    errors: {},
    raw: error,
  };
}

/**
 * Workflow actions (sales, returns) answer `{"detail": str(ValidationError)}`, which arrives as "['Order exceeds
 * customer credit limit']". Show just the text (BACKEND_REQUESTS 11).
 */
function unwrapDjangoMessage(message: string): string {
  const match = /^\[\s*(['"])([\s\S]*)\1\s*\]$/.exec(message ?? '');
  return match ? match[2] : message;
}
