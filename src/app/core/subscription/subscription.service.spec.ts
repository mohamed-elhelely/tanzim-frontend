import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from '../auth/auth.service';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { CurrentSubscription } from './subscription.model';
import { SubscriptionService } from './subscription.service';

const URL = '/api/subscriptions/subscriptions/current/';

function subscription(overrides: Partial<CurrentSubscription> = {}): CurrentSubscription {
  return {
    id: 1,
    plan_name: 'Basic',
    status: 'active',
    modules: [
      { id: 1, module: { id: 6, name: 'Locations', code: 'location', is_active: true }, is_active: true },
      { id: 2, module: { id: 7, name: 'Inventory', code: 'inventory', is_active: true }, is_active: false },
    ],
    ...overrides,
  };
}

describe('SubscriptionService', () => {
  let httpMock: HttpTestingController;
  let role = 'COMPANY';

  function setup(): SubscriptionService {
    TestBed.configureTestingModule({
      providers: [...provideApiTesting(), { provide: AuthService, useValue: { role: () => role } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    return TestBed.inject(SubscriptionService);
  }

  beforeEach(() => (role = 'COMPANY'));
  afterEach(() => httpMock.verify());

  it('allows only active modules of an active subscription, and nothing while loading', () => {
    const service = setup();
    service.load();
    expect(service.allows('location')).toBeFalse();
    httpMock.expectOne(URL).flush(envelope(subscription()));
    expect(service.allows('location')).toBeTrue();
    expect(service.allows('inventory')).toBeFalse();
  });

  it('allows nothing when the subscription is not trial/active', () => {
    const service = setup();
    service.load();
    httpMock.expectOne(URL).flush(envelope(subscription({ status: 'expired' })));
    expect(service.allows('location')).toBeFalse();
  });

  it('allows nothing when the company has no subscription (404)', () => {
    const service = setup();
    service.load();
    httpMock.expectOne(URL).flush(errorEnvelope(404, 'No active subscription found'), { status: 404, statusText: 'Not Found' });
    expect(service.allows('location')).toBeFalse();
  });

  it('fails open on other errors, since the backend still checks', () => {
    const service = setup();
    service.load();
    httpMock.expectOne(URL).flush(errorEnvelope(500, 'Boom'), { status: 500, statusText: 'Server Error' });
    expect(service.allows('inventory')).toBeTrue();
  });

  it('does not call the API for platform admins', () => {
    role = 'ADMIN';
    const service = setup();
    service.load();
    httpMock.expectNone(URL);
    expect(service.allows('location')).toBeFalse();
  });
});
