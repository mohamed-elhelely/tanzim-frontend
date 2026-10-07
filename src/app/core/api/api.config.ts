import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

function normalizeBaseUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/`;
}

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => normalizeBaseUrl(environment.apiBaseUrl),
});

export const API_CONFIG = {
  defaultPageSize: 25,
  withTrailingSlash: true,
} as const;
