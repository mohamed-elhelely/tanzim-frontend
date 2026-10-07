import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorResponse } from '../models/api-response.model';

export interface AppError {
  status: number;
  message: string;
  errors: Record<string, string[]>;
  raw?: unknown;
}

export function toAppError(error: unknown): AppError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as Partial<ApiErrorResponse> | string | null;
    if (body && typeof body === 'object' && body.error) {
      return {
        status: error.status,
        message: body.error.message,
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
