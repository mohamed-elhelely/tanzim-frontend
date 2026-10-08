import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay } from 'rxjs';
import { BaseApiService } from '../api/base-api.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './auth.model';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * What the signed-in user may see and do, from GET /api/company/v1/me/: permission codenames, the company's
 * subscription modules and the platform-staff flag. Loaded once per sign-in (by the shell and by guards).
 *
 * While loading, `can()` and `hasModule()` answer false so gated menus don't flash in and out.
 * If /me fails they answer true (fail open): the backend still refuses with 403, and hiding everything
 * on a network blip would be worse.
 */
@Injectable({ providedIn: 'root' })
export class AccessService extends BaseApiService {
  private readonly auth = inject(AuthService);
  private readonly state = signal<LoadState>('idle');
  private readonly me = signal<CurrentUser | null>(null);
  private request$: Observable<void> | null = null;

  /** Platform staff. /me wins over the token, which older sessions issued without `is_staff`. */
  readonly isStaff = computed(() => this.me()?.is_staff ?? this.auth.user()?.isStaff ?? false);
  /** True once /me answered (or failed); guards wait for this. */
  readonly settled = computed(() => this.state() === 'ready' || this.state() === 'error');

  constructor() {
    super();
    // A different user (or none, after logout) must not inherit the previous user's access. Only a real
    // change resets: the first run must not wipe a load a guard has already started.
    let previous: string | null | undefined;
    effect(() => {
      const id = this.auth.user()?.id ?? null;
      if (previous !== undefined && id !== previous) {
        untracked(() => this.reset());
      }
      previous = id;
    });
  }

  /** Starts loading /me (once per sign-in) and completes when it has answered. */
  load(): Observable<void> {
    if (this.settled()) {
      return of(undefined);
    }
    if (!this.request$) {
      this.state.set('loading');
      this.request$ = this.get<CurrentUser>('company/v1/me/').pipe(
        map((response) => {
          this.me.set(response.data);
          this.state.set('ready');
        }),
        catchError(() => {
          this.state.set('error');
          return of(undefined);
        }),
        finalize(() => (this.request$ = null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );
    }
    return this.request$;
  }

  private reset(): void {
    this.me.set(null);
    this.state.set('idle');
    this.request$ = null;
  }

  /** e.g. `can('add_department')`. Only the company resources are permission-gated by the backend. */
  can(codename: string): boolean {
    const state = this.state();
    if (state === 'error') {
      return true;
    }
    const me = this.me();
    return state === 'ready' && !!me && (me.has_full_access || me.permissions.includes(codename));
  }

  /** e.g. `hasModule('inventory')`. */
  hasModule(code: string): boolean {
    const state = this.state();
    return state === 'error' || (state === 'ready' && !!this.me()?.modules.includes(code));
  }
}
