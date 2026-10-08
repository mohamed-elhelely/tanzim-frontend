import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

function normalizeBaseUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/`;
}

/** Base URL of the backend API, always ending in '/'. Comes from src/environments (proxied to :8000 in dev). */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => normalizeBaseUrl(environment.apiBaseUrl),
});
