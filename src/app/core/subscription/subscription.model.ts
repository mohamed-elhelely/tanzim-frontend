/** GET /api/subscriptions/subscriptions/current/ (API_REFERENCE.md → "Subscriptions"). Only the fields the UI reads. */
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';

export interface SubscriptionModule {
  id: number;
  module: { id: number; name: string; code: string; is_active: boolean };
  is_active: boolean;
}

export interface CurrentSubscription {
  id: number;
  plan_name: string;
  status: SubscriptionStatus;
  modules: SubscriptionModule[];
}
