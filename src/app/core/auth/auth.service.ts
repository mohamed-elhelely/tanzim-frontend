import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { Observable, finalize, map, shareReplay, throwError } from 'rxjs';
import { API_BASE_URL } from '../api/api.config';
import { AppError } from '../errors/app-error';
import { ApiResponse } from '../models/api-response.model';
import { AccessTokenPayload, AuthRole, AuthUser, LoginResponse, RefreshResponse } from './auth.model';
import { TokenStorageService } from './token-storage.service';

const USER_STORAGE_KEY = 'tanzim.user';

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

  refreshAccessToken(): Observable<string> {
    if (this.refreshRequest$) {
      return this.refreshRequest$;
    }

    const refreshToken = this.tokens.refreshToken();
    if (!refreshToken) {
      return throwError(() => this.unauthorized('Missing refresh token'));
    }

    this.refreshRequest$ = this.http
      .post<ApiResponse<RefreshResponse>>(`${this.baseUrl}refresh/`, { refresh: refreshToken })
      .pipe(
        map((response) => {
          const access = response.data?.access;
          if (!access) {
            throw this.invalidResponse('refresh');
          }
          this.tokens.setTokens(access);
          return access;
        }),
        finalize(() => {
          this.refreshRequest$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    return this.refreshRequest$;
  }

  logout(): void {
    this.tokens.clear();
    this.userState.set(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    this.refreshRequest$ = null;
    void this.router.navigate(['/auth/login']);
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

    const payload = this.decode(accessToken);
    if (!payload || this.isExpired(payload)) {
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
