import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** `${origin}/api/` with exactly one slash between parts. */
export function apiBaseUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/api/`;
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => apiBaseUrl(environment.apiUrl),
});

export const API_CONFIG = {
  defaultPageSize: 25,
  withTrailingSlash: true,
} as const;
