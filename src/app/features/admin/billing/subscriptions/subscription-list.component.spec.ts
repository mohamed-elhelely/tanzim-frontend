import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../../../testing/api-testing';
import { Subscription } from '../platform-billing.models';
import { SubscriptionListComponent } from './subscription-list.component';

const URL = '/api/subscriptions/v1/subscriptions/';

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 2,
    company: 1,
    company_name: 'Acme',
    plan: 3,
    plan_name: 'Professional',
    status: 'active',
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    trial_end_date: null,
    next_billing_date: '2026-11-01',
    billing_email: 'billing@acme.example',
    licensed_users: 10,
    auto_renew: true,
    modules: [],
    is_trial_active: false,
    days_remaining: 80,
    ...overrides,
  };
}

describe('SubscriptionListComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({ imports: [SubscriptionListComponent], providers: [...provideApiTesting()] });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SubscriptionListComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/company/v1/admin/company/').flush(envelope([{ id: 1, name: 'Acme' }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('lists every company with its name and filters by company', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([subscription()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acme');

    fixture.componentInstance.company = 1;
    fixture.componentInstance.onFilterChange();
    httpMock.expectOne((r) => r.url === URL && r.params.get('company') === '1').flush(envelope([], 0));
  });

  it('switches a module on, then shows the subscription as saved', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === URL && r.params.has('page')).flush(envelope([subscription()], 1));
    fixture.componentInstance.openModules(subscription());
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope([{ id: 7, name: 'Inventory', code: 'inventory', is_active: true }]));

    fixture.componentInstance.toggleModule(fixture.componentInstance.catalog()[0], true);
    expect(httpMock.expectOne(`${URL}2/add_module/`).request.body).toEqual({ module_id: 7 });
  });
});
