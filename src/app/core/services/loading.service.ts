import { Injectable, computed, signal } from '@angular/core';

/** Number of HTTP requests in flight; fed by loadingInterceptor, shown by LoadingBarComponent. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly activeRequests = signal(0);

  readonly isLoading = computed(() => this.activeRequests() > 0);

  begin(): void {
    this.activeRequests.update((count) => count + 1);
  }

  end(): void {
    this.activeRequests.update((count) => Math.max(0, count - 1));
  }
}
