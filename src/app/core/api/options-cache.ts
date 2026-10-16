import { DestroyRef, Injectable, effect, inject, untracked } from '@angular/core';
import { Observable, defer, finalize, shareReplay, tap } from 'rxjs';
import { AuthService } from '../auth/auth.service';

/** How long a dropdown list is reused. */
export const OPTIONS_CACHE_TTL_MS = 5 * 60_000;
const CHANNEL = 'tanzim.options-cache';

/**
 * Writes that change another resource's lists. Paying or crediting a supplier invoice changes which invoices are
 * still open (`supplier-invoice/?open=true` in the supplier payment form).
 */
const ALSO_CHANGES: Record<string, string[]> = {
  'accounting/v1/supplier-payments/': ['inventory/v1/supplier-invoice/'],
  'accounting/v1/debit-notes/': ['inventory/v1/supplier-invoice/'],
};

interface Entry {
  path: string;
  expires: number;
  value$: Observable<unknown>;
}

/**
 * Dropdown lists (`?dropdown=true`) cached per resource and filters for at most 5 minutes. Any successful write
 * (POST/PUT/PATCH/DELETE through BaseApiService) to a resource drops its lists at once: a write to
 * `inventory/v1/brand/3/`, `…/brand/import/` or `…/brand/` clears every `inventory/v1/brand/` entry. Other tabs of
 * this browser hear about writes through a BroadcastChannel; changes made by other users show after the 5 minutes.
 * Signing out or switching user forgets everything (lists belong to a company).
 */
@Injectable({ providedIn: 'root' })
export class OptionsCache {
  private readonly entries = new Map<string, Entry>();
  private readonly channel: BroadcastChannel | null = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL);

  constructor() {
    const auth = inject(AuthService);
    let previous: string | null | undefined;
    effect(() => {
      const id = auth.user()?.id ?? null;
      if (previous !== undefined && id !== previous) {
        untracked(() => this.entries.clear());
      }
      previous = id;
    });
    if (this.channel) {
      this.channel.onmessage = (event: MessageEvent) => typeof event.data === 'string' && this.drop(event.data);
      inject(DestroyRef).onDestroy(() => this.channel?.close());
    }
  }

  /** The cached list for `path` + `params`, or `load()` shared by every caller until it answers. */
  get<T>(path: string, params: Record<string, string | number>, load: () => Observable<T>): Observable<T> {
    const key = `${path}?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]).sort()).toString()}`;
    const hit = this.entries.get(key);
    if (hit && hit.expires > Date.now()) {
      return hit.value$ as Observable<T>;
    }
    let failed = false;
    const value$ = defer(load).pipe(
      tap({ error: () => (failed = true) }),
      finalize(() => failed && this.entries.get(key)?.value$ === value$ && this.entries.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.entries.set(key, { path, expires: Date.now() + OPTIONS_CACHE_TTL_MS, value$ });
    return value$;
  }

  /** A write to `writtenPath` succeeded: drop its resource's lists here and in the other tabs. */
  invalidate(writtenPath: string): void {
    this.drop(writtenPath);
    this.channel?.postMessage(writtenPath);
  }

  private drop(writtenPath: string): void {
    const related = Object.entries(ALSO_CHANGES)
      .filter(([source]) => writtenPath.startsWith(source))
      .flatMap(([, targets]) => targets);
    for (const [key, entry] of this.entries) {
      if (writtenPath.startsWith(entry.path) || related.includes(entry.path)) {
        this.entries.delete(key);
      }
    }
  }
}
