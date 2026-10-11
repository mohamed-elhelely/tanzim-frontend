import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AccessService } from '../../../../core/auth/access.service';
import { envelope, provideApiTesting } from '../../../../testing/api-testing';
import { Subscription } from '../platform-billing.models';
import { SubscriptionModulesComponent } from './subscription-modules.component';

const URL = '/api/subscriptions/v1/subscriptions/';
const CATALOG = [
  { id: 7, name: 'Inventory', code: 'inventory', price_per_user: '3.00', icon: 'pi-warehouse', is_active: true },
  { id: 8, name: 'Location', code: 'location', price_per_user: '2.50', icon: 'pi-map-marker', is_active: true },
];

function subscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: 4,
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
    modules: [{ id: 1, module: { ...CATALOG[0] }, price_per_user: '3.00', is_active: true }],
    is_trial_active: false,
    days_remaining: 80,
    ...overrides,
  };
}

describe('SubscriptionModulesComponent', () => {
  let httpMock: HttpTestingController;
  let reload: jasmine.Spy;

  function setup(value: Subscription, staff = true, ownCompany = 99) {
    reload = jasmine.createSpy('reload');
    const access = { isStaff: signal(staff), current: signal({ company: { id: ownCompany } }), reload };
    TestBed.configureTestingModule({
      imports: [SubscriptionModulesComponent],
      providers: [...provideApiTesting(), { provide: AccessService, useValue: access }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SubscriptionModulesComponent);
    fixture.componentRef.setInput('subscription', value);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('shows the enabled modules and the estimated cost', () => {
    const fixture = setup(subscription());
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope(CATALOG));
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component.toggles()).toEqual({ 7: true, 8: false });
    expect(component.estimatedCost()).toBe(30);
    expect(fixture.nativeElement.textContent).toContain('Location');
  });

  it('switches a module on, re-fetches the subscription and refreshes /me for the own company', () => {
    const fixture = setup(subscription(), true, 1);
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope(CATALOG));
    const component = fixture.componentInstance;

    component.toggle(component.rows()[1], true);
    expect(component.busyModule()).toBe(8);
    const add = httpMock.expectOne(`${URL}4/add_module/`);
    expect(add.request.body).toEqual({ module_id: 8 });
    add.flush(envelope({ id: 2 }), { status: 201, statusText: 'Created' });

    const enabledBoth = subscription({
      modules: [...subscription().modules, { id: 2, module: { ...CATALOG[1] }, price_per_user: '2.50', is_active: true }],
    });
    httpMock.expectOne(`${URL}4/`).flush(envelope(enabledBoth));
    expect(component.toggles()).toEqual({ 7: true, 8: true });
    expect(component.estimatedCost()).toBe(55);
    expect(component.busyModule()).toBeNull();
    expect(reload).toHaveBeenCalled();
  });

  it('asks before switching a module off and switches it back when cancelled', () => {
    const fixture = setup(subscription());
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope(CATALOG));
    const confirmation = TestBed.inject(ConfirmationService);
    const ask = spyOn(confirmation, 'confirm');
    const component = fixture.componentInstance;

    component.toggle(component.rows()[0], false);
    expect(component.toggles()[7]).toBeFalse();
    ask.calls.mostRecent().args[0].reject!();
    expect(component.toggles()[7]).toBeTrue();
    expect(component.busyModule()).toBeNull();

    component.toggle(component.rows()[0], false);
    ask.calls.mostRecent().args[0].accept!();
    httpMock.expectOne(`${URL}4/remove_module/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne(`${URL}4/`).flush(envelope(subscription({ modules: [] })));
    expect(component.toggles()[7]).toBeFalse();
    expect(reload).not.toHaveBeenCalled();
  });

  it('locks the toggles unless the subscription is trial or active', () => {
    const fixture = setup(subscription({ status: 'canceled' }));
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope(CATALOG));
    const component = fixture.componentInstance;

    expect(component.editable()).toBeFalse();
    component.toggle(component.rows()[1], true);
    httpMock.expectNone(`${URL}4/add_module/`);
  });

  it('shows the backend detail when add_module is refused', () => {
    const fixture = setup(subscription({ status: 'trial' }));
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope(CATALOG));
    const component = fixture.componentInstance;
    const toast = spyOn(TestBed.inject(MessageService), 'add');

    component.toggle(component.rows()[0], true);
    httpMock
      .expectOne(`${URL}4/add_module/`)
      .flush({ detail: 'Module already enabled' }, { status: 400, statusText: 'Bad Request' });
    expect(toast).toHaveBeenCalledWith(jasmine.objectContaining({ severity: 'error', detail: 'Module already enabled' }));
    httpMock.expectOne(`${URL}4/`).flush(envelope(subscription()));
    expect(component.busyModule()).toBeNull();
  });

  it('renders nothing for non-staff', () => {
    const fixture = setup(subscription(), false);
    httpMock.expectNone('/api/subscriptions/v1/modules/');
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });
});
