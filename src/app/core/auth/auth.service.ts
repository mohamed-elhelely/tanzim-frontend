import { HttpClient } from '@angular/common/http';
import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Observable, defer, finalize, firstValueFrom, from, map, shareReplay, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { AppError } from '../errors/app-error';
import { ApiResponse } from '../models/api-response.model';
import { AccessTokenPayload, AuthRole, AuthUser, LoginResponse, RefreshResponse } from './auth.model';
import { TokenStorageService } from './token-storage.service';

const USER_STORAGE_KEY = 'tanzim.user';
/** Web Locks name: one refresh at a time across every tab of this browser. */
const REFRESH_LOCK = 'tanzim.refresh';

interface StoredUser {
  id: string;
  name: string | null;
  role: AuthRole;
}

/**
 * The signed-in user. Login stores the tokens and builds `AuthUser` from the login response plus the
 * decoded JWT (company_id, company_role, is_company_admin). `role` drives the menu and the route guards:
 * ADMIN = no company (platform staff when `isStaff`), COMPANY = company admin, EMPLOYEE = everyone else.
 * What a user may open or change comes from AccessService (GET /me).
 *
 * Tokens: the access token lives 30 minutes, the refresh token 7 days and rotates on every refresh (sending a spent
 * one again ends the session). So only one refresh may run at a time, in this tab (a shared observable) and across
 * tabs (a Web Lock; inside it, a token another tab already rotated is used instead of refreshing again).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly tokens = inject(TokenStorageService);
  private readonly router = inject(Router);

  private readonly userState = signal<AuthUser | null>(this.restoreUser());
  private refreshRequest$: Observable<string> | null = null;

  readonly user = this.userState.asReadonly();
  readonly isAuthenticated = computed(() => this.userState() !== null);
  readonly role = computed<AuthRole | null>(() => this.userState()?.role ?? null);

  constructor() {
    // Another tab logged out (or its session ended): its storage event emptied the tokens, so leave here too.
    effect(() => {
      if (!this.tokens.refreshToken() && untracked(() => this.userState())) {
        untracked(() => this.endSession());
      }
    });
  }

  login(email: string, password: string): Observable<AuthUser> {
    return this.http
      .post<ApiResponse<LoginResponse>>(`${this.baseUrl}login/`, { email, password })
      .pipe(
        map((response) => {
          const data = response.data;
          if (!data || !data.access || !data.refresh) {
            throw this.invalidResponse('login');
          }
          this.tokens.setTokens(data.access, data.refresh);
          const payload = this.decode(data.access);
          const user: AuthUser = {
            id: String(payload?.user_id ?? ''),
            name: data.user,
            role: data.role,
            companyId: payload?.company_id ?? null,
            companyRole: payload?.company_role ?? null,
            isCompanyAdmin: payload?.is_company_admin ?? false,
            isStaff: data.is_staff ?? payload?.is_staff ?? false,
          };
          this.setUser(user);
          return user;
        }),
      );
  }

  /** A fresh access token; every caller during a refresh shares the same one (see the class comment). */
  refreshAccessToken(): Observable<string> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const staleRefresh = this.tokens.refreshToken();
    if (!staleRefresh) {
      return throwError(() => this.unauthorized('Missing refresh token'));
    }

    this.refreshRequest$ = defer(() => from(this.withRefreshLock(() => this.rotate(staleRefresh)))).pipe(
      finalize(() => {
        this.refreshRequest$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.refreshRequest$;
  }

  /** Signing out on purpose: ends the session on the server (best effort), then locally. */
  logout(): void {
    const refresh = this.tokens.refreshToken();
    if (refresh) {
      // With the refresh token in the body no Authorization header is needed, and it works after the access token expired.
      this.http.post(`${this.baseUrl}logout/`, { refresh }).subscribe({ error: () => undefined });
    }
    this.endSession();
  }

  /** The session is over (refused, expired or ended elsewhere): forget it here without calling the server. */
  endSession(): void {
    this.tokens.clear();
    this.userState.set(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.refreshRequest$ = null;
    void this.router.navigate(['/auth/login']);
  }

  /**
   * Inside the lock: if another tab already rotated the refresh token we started from, use the tokens it stored
   * (sending ours again would count as reuse and end the session); otherwise refresh.
   */
  private async rotate(staleRefresh: string): Promise<string> {
    this.tokens.reload();
    const current = this.tokens.refreshToken();
    const access = this.tokens.accessToken();
    if (!current) {
      throw this.unauthorized('Signed out');
    }
    if (current !== staleRefresh && access) {
      return access;
    }
    const response = await firstValueFrom(
      this.http.post<ApiResponse<RefreshResponse>>(`${this.baseUrl}refresh/`, { refresh: current }),
    );
    const data = response.data;
    if (!data?.access || !data.refresh) {
      throw this.invalidResponse('refresh');
    }
    this.tokens.setTokens(data.access, data.refresh);
    return data.access;
  }

  /** Runs `task` under a browser-wide lock where Web Locks exist (all current browsers); otherwise just runs it. */
  private withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    return locks ? (locks.request(REFRESH_LOCK, task) as Promise<T>) : task();
  }

  private setUser(user: AuthUser): void {
    this.userState.set(user);
    const stored: StoredUser = { id: user.id, name: user.name, role: user.role };
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(stored));
  }

  private restoreUser(): AuthUser | null {
    const accessToken = this.tokens.accessToken();
    if (!accessToken) {
      return null;
    }

    // An expired access token is normal after 30 minutes: the first call refreshes it. Only a missing or expired
    // refresh token means the session is over.
    const payload = this.decode(accessToken);
    const refreshToken = this.tokens.refreshToken();
    const refreshPayload = refreshToken ? this.decode(refreshToken) : null;
    if (!payload || !refreshPayload || this.isExpired(refreshPayload)) {
      this.tokens.clear();
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }

    const stored = this.readStoredUser();
    return {
      id: String(payload.user_id ?? stored?.id ?? ''),
      name: stored?.name ?? null,
      role: stored?.role ?? this.deriveRole(payload),
      companyId: payload.company_id ?? null,
      companyRole: payload.company_role ?? null,
      isCompanyAdmin: payload.is_company_admin ?? false,
      isStaff: payload.is_staff ?? false,
    };
  }

  private deriveRole(payload: AccessTokenPayload): AuthRole {
    if (payload.company_id === null || payload.company_id === undefined) {
      return 'ADMIN';
    }
    return payload.is_company_admin ? 'COMPANY' : 'EMPLOYEE';
  }

  private readStoredUser(): StoredUser | null {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  }

  private decode(token: string): AccessTokenPayload | null {
    try {
      return jwtDecode<AccessTokenPayload>(token);
    } catch {
      return null;
    }
  }

  private isExpired(payload: AccessTokenPayload): boolean {
    return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now();
  }

  private invalidResponse(endpoint: string): AppError {
    return { status: 0, message: `Invalid ${endpoint} response`, errors: {} };
  }

  private unauthorized(message: string): AppError {
    return { status: 401, message, errors: {} };
  }
}
