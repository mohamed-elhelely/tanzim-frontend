import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../../testing/api-testing';
import { Plan } from '../platform-billing.models';
import { PlanFormComponent } from './plan-form.component';

const URL = '/api/subscriptions/v1/plans/';
const MODULES = [
  { id: 1, name: 'Inventory', code: 'inventory', is_active: true },
  { id: 2, name: 'Accounting', code: 'accounting', is_active: true },
  { id: 3, name: 'Legacy', code: 'legacy', is_active: false },
];

describe('PlanFormComponent', () => {
  let httpMock: HttpTestingController;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [PlanFormComponent],
      providers: [...provideApiTesting(), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(PlanFormComponent);
    fixture.detectChanges();
    httpMock.expectOne('/api/subscriptions/v1/modules/').flush(envelope(MODULES));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('offers active modules, keeps a module out of the other list, and sends both lists', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    expect(component.includedOptions().map((o) => o.value)).toEqual([1, 2]);

    component.form.patchValue({ name: 'Pro', base_price: '99.00', included_module_ids: [1], addon_module_ids: [2] });
    expect(component.addonOptions().map((o) => o.value)).toEqual([2]);
    expect(component.includedOptions().map((o) => o.value)).toEqual([1]);

    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body.included_module_ids).toEqual([1]);
    expect(req.request.body.addon_module_ids).toEqual([2]);
    req.flush(envelope({ id: 4 }), { status: 201, statusText: 'Created' });
  });

  it("loads a plan's modules into the lists", () => {
    const fixture = setup('4');
    const plan: Partial<Plan> = {
      id: 4,
      name: 'Pro',
      description: '',
      billing_period: 'monthly',
      base_price: '99.00',
      max_users: null,
      trial_days: 14,
      is_featured: false,
      included_modules: [MODULES[0] as never],
      addon_modules: [],
    };
    httpMock.expectOne(`${URL}4/`).flush(envelope(plan));
    expect(fixture.componentInstance.form.getRawValue().included_module_ids).toEqual([1]);
    expect(fixture.componentInstance.form.getRawValue().max_users).toBe('');
  });
});
