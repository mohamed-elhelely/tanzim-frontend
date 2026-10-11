import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { MessageService } from 'primeng/api';
import { AccessService } from '../../../../core/auth/access.service';
import { envelope, provideApiTesting } from '../../../../testing/api-testing';
import { SubscriptionFormComponent } from './subscription-form.component';

const URL = '/api/subscriptions/v1/subscriptions/';
const MODULES = [
  { id: 7, name: 'Inventory', code: 'inventory', price_per_user: '3.00', icon: 'pi-warehouse', is_active: true },
  { id: 8, name: 'Location', code: 'location', price_per_user: '2.50', icon: 'pi-map-marker', is_active: true },
];

describe('SubscriptionFormComponent', () => {
  let httpMock: HttpTestingController;
  let reload: jasmine.Spy;

  function setup() {
    reload = jasmine.createSpy('reload');
    TestBed.configureTestingModule({
      imports: [SubscriptionFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } },
        { provide: AccessService, useValue: { isStaff: signal(true), current: signal({ company: { id: 1 } }), reload } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(SubscriptionFormComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/company/v1/admin/company/').flush(envelope([{ id: 1, name: 'Acme' }]));
    httpMock.expectOne('/api/subscriptions/v1/plans/').flush(envelope([{ id: 3, name: 'Pro' }]));
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope(MODULES));
    const component = fixture.componentInstance;
    component.form.patchValue({ company: 1, plan: 3, billing_email: 'billing@acme.example' });
    return component;
  }

  afterEach(() => httpMock.verify());

  it('adds each picked module after creating the subscription, without sending them in the create body', () => {
    const component = setup();
    component.form.patchValue({ module_ids: [7, 8] });
    component.submit();

    const create = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(create.request.body.module_ids).toBeUndefined();
    expect(create.request.body.modules).toBeUndefined();
    create.flush(envelope({ id: 9, company: 1 }), { status: 201, statusText: 'Created' });

    const adds = httpMock.match(`${URL}9/add_module/`);
    expect(adds.map((r) => r.request.body)).toEqual([{ module_id: 7 }, { module_id: 8 }]);
    adds.forEach((r) => r.flush(envelope({ id: 1 }), { status: 201, statusText: 'Created' }));
    expect(component.saving()).toBeFalse();
    expect(reload).toHaveBeenCalled();
  });

  it('names the modules the backend refused', () => {
    const component = setup();
    const toast = spyOn(TestBed.inject(MessageService), 'add');
    component.form.patchValue({ module_ids: [7, 8] });
    component.submit();
    httpMock.expectOne((r) => r.url === URL && r.method === 'POST').flush(envelope({ id: 9, company: 1 }));

    const [inventory, location] = httpMock.match(`${URL}9/add_module/`);
    inventory.flush(envelope({ id: 1 }), { status: 201, statusText: 'Created' });
    location.flush({ detail: 'Module not found' }, { status: 404, statusText: 'Not Found' });
    const failure = toast.calls.all().find((call) => call.args[0].severity === 'error');
    expect(failure?.args[0].detail).toContain('admin.billing.subscriptions.modulesFailed');
  });

  it('skips modules for a status that cannot have them', () => {
    const component = setup();
    component.form.patchValue({ status: 'canceled', module_ids: [7] });
    expect(component.modulesAllowed()).toBeFalse();
    component.submit();
    httpMock.expectOne((r) => r.url === URL && r.method === 'POST').flush(envelope({ id: 9, company: 1 }));
    httpMock.expectNone(`${URL}9/add_module/`);
  });
});
