import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseApiService } from '../../core/api/base-api.service';
import { CurrentSubscription, PlatformInvoice } from './billing.models';

/**
 * The company's own subscription and the invoices Tanzim sent it. Read-only here: creating, issuing and
 * paying invoices is the platform's job.
 */
@Injectable({ providedIn: 'root' })
export class BillingService extends BaseApiService {
  /** 404 when the company has no subscription. */
  currentSubscription(): Observable<CurrentSubscription> {
    return this.get<CurrentSubscription>('subscriptions/subscriptions/current/').pipe(map((r) => r.data as CurrentSubscription));
  }

  /** Newest first; the endpoint isn't paginated. */
  invoices(): Observable<PlatformInvoice[]> {
    return this.get<PlatformInvoice[]>('subscriptions/invoices/').pipe(map((r) => r.data ?? []));
  }
}
