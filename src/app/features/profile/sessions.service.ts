import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../core/api/base-api.service';

/** One signed-in device: a login session (GET /api/company/v1/me/sessions/). */
export interface UserSession {
  /** UUID; the login's `session_id`. */
  id: string;
  created_at: string;
  last_used_at: string;
  /** When the session's refresh token expires; moves forward on every refresh. */
  expires_at: string;
  ip_address: string | null;
  user_agent: string;
  /** The session making this call (this browser). */
  current: boolean;
}

/** The signed-in user's own sessions; any logged-in user, no permission needed. */
@Injectable({ providedIn: 'root' })
export class SessionsService extends BaseApiService {
  private readonly path = 'company/v1/me/sessions/';

  /** Most recently used first. */
  list(): Observable<UserSession[]> {
    return this.get<UserSession[]>(this.path).pipe(map((response) => response.data ?? []));
  }

  /** Signs that device out. */
  revoke(id: string): Observable<void> {
    return this.delete<void>(`${this.path}${id}/`).pipe(map(() => undefined));
  }

  /** Signs out every other device; returns how many were signed out. */
  revokeOthers(): Observable<number> {
    return this.post<{ revoked: number }>(`${this.path}revoke-others/`, {}).pipe(map((response) => response.data?.revoked ?? 0));
  }
}

export interface DeviceInfo {
  browser: string;
  os: string;
  mobile: boolean;
}

/** A readable device name from a user agent: the browser and OS families, enough to tell devices apart. */
export function describeUserAgent(userAgent: string | null | undefined): DeviceInfo {
  const ua = userAgent ?? '';
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser\//.test(ua) ? 'Samsung Internet'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) ? 'Safari'
    : '';
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Linux/.test(ua) ? 'Linux'
    : '';
  return { browser, os, mobile: /Mobile|Android|iPhone|iPad/.test(ua) };
}
