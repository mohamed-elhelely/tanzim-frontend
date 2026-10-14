import { Injectable, signal } from '@angular/core';

const ACCESS_TOKEN_KEY = 'tanzim.accessToken';
const REFRESH_TOKEN_KEY = 'tanzim.refreshToken';

/**
 * JWT access/refresh tokens, kept in localStorage so a reload stays signed in and every tab shares them.
 * Another tab's refresh or logout reaches this tab through the `storage` event, so the signals never hold a token
 * the server has already rotated away.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly access = signal<string | null>(localStorage.getItem(ACCESS_TOKEN_KEY));
  private readonly refresh = signal<string | null>(localStorage.getItem(REFRESH_TOKEN_KEY));

  readonly accessToken = this.access.asReadonly();
  readonly refreshToken = this.refresh.asReadonly();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event) => {
        if (event.key === ACCESS_TOKEN_KEY || event.key === REFRESH_TOKEN_KEY || event.key === null) {
          this.reload();
        }
      });
    }
  }

  /** Both tokens: the refresh token rotates on every refresh, so the old one must never be kept. */
  setTokens(accessToken: string, refreshToken: string): void {
    this.access.set(accessToken);
    this.refresh.set(refreshToken);
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  /** Re-reads the stored tokens, e.g. inside the cross-tab refresh lock where another tab may just have rotated them. */
  reload(): void {
    this.access.set(localStorage.getItem(ACCESS_TOKEN_KEY));
    this.refresh.set(localStorage.getItem(REFRESH_TOKEN_KEY));
  }

  clear(): void {
    this.access.set(null);
    this.refresh.set(null);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
