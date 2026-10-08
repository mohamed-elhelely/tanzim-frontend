import { Injectable, signal } from '@angular/core';

const ACCESS_TOKEN_KEY = 'tanzim.accessToken';
const REFRESH_TOKEN_KEY = 'tanzim.refreshToken';

/** JWT access/refresh tokens, kept in localStorage so a reload stays signed in. */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly access = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly refresh = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));

  readonly accessToken = this.access.asReadonly();
  readonly refreshToken = this.refresh.asReadonly();

  setTokens(accessToken: string, refreshToken?: string): void {
    this.access.set(accessToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      this.refresh.set(refreshToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  clear(): void {
    this.access.set(null);
    this.refresh.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
