import { Injectable, inject, signal } from '@angular/core';
import { BaseApiService } from '../api/base-api.service';
import { AuthService } from '../auth/auth.service';
import { AppError } from '../errors/app-error';
import { CurrentSubscription } from './subscription.model';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * The company's enabled subscription modules, mirroring the backend's FeatureFlag rules:
 * the subscription is trial/active and both the subscription module and the module are active.
 */
@Injectable({ providedIn: 'root' })
export class SubscriptionService extends BaseApiService {
  private readonly auth = inject(AuthService);
  private readonly state = signal<LoadState>('idle');
  private readonly modules = signal<ReadonlySet<string>>(new Set());

  /** Loads the current subscription; platform admins have no company, so they get no modules. */
  load(): void {
    this.modules.set(new Set());
    if (this.auth.role() === 'ADMIN') {
      this.state.set('ready');
      return;
    }
    this.state.set('loading');
    this.get<CurrentSubscription>('subscriptions/subscriptions/current/').subscribe({
      next: (response) => {
        this.modules.set(this.enabledCodes(response.data));
        this.state.set('ready');
      },
      // 404 means the company has no subscription: nothing is enabled.
      // Any other failure fails open; the backend still answers 403 for a missing module.
      error: (error: AppError) => this.state.set(error.status === 404 ? 'ready' : 'error'),
    });
  }

  /** False while loading, so gated menus don't flash in and out. */
  allows(code: string): boolean {
    const state = this.state();
    return state === 'error' || (state === 'ready' && this.modules().has(code));
  }

  private enabledCodes(subscription: CurrentSubscription | null): ReadonlySet<string> {
    if (!subscription || (subscription.status !== 'trial' && subscription.status !== 'active')) {
      return new Set();
    }
    return new Set(
      subscription.modules.filter((m) => m.is_active && m.module.is_active).map((m) => m.module.code),
    );
  }
}
