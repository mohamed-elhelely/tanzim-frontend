import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCustomer } from '../../../testing/sales-fixtures';
import { CustomerFormComponent } from './customer-form.component';

const URL = '/api/sales/customers/';

describe('CustomerFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [CustomerFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(CustomerFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates with trimmed fields, an upper-case currency, no credit limit and compact addresses', () => {
    const component = setup(null).componentInstance;
    component.form.patchValue({ name: ' Acme ', currency: 'sar', credit_limit: '' });
    component.form.controls.billing_address.patchValue({ street: ' King Fahd Rd ', city: 'Riyadh' });
    component.copyBillingToShipping();
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({
        name: 'Acme',
        customer_type: 'business',
        currency: 'SAR',
        credit_limit: null,
        billing_address: { street: 'King Fahd Rd', city: 'Riyadh' },
        shipping_address: { street: 'King Fahd Rd', city: 'Riyadh' },
        is_active: true,
      }),
    );
    expect(req.request.body.credit_used).toBeUndefined();
    req.flush(envelope(makeCustomer()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/sales/customers']);
  });

  it('rejects a bad currency and credit limit before sending', () => {
    const component = setup(null).componentInstance;
    component.form.patchValue({ name: 'A', currency: 'RIYAL', credit_limit: '-5' });
    component.submit();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(component.form.controls.currency.hasError('pattern')).toBeTrue();
    expect(component.form.controls.credit_limit.hasError('pattern')).toBeTrue();
  });

  it('on edit, loads the record (with its credit figures) and PATCHes', () => {
    const fixture = setup('1');
    const component = fixture.componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeCustomer()));
    fixture.detectChanges();
    expect(component.form.controls.shipping_address.controls.city.value).toBe('Jeddah');
    expect(fixture.nativeElement.textContent).toContain('276.00');
    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body).toEqual(jasmine.objectContaining({ name: 'Acme Trading', credit_limit: '1000.0000', currency: 'SAR' }));
    req.flush(envelope(makeCustomer()));
  });

  it('shows a server error under the field', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.patchValue({ name: 'Acme' });
    component.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Unknown error', { email: ['Enter a valid email address.'] }), { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(component.form.controls.email.errors?.['serverError']).toBe('Enter a valid email address.');
  });
});
