import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeSupplierPayment } from '../../../testing/accounting-fixtures';
import { SupplierPaymentFormComponent } from './supplier-payment-form.component';

const URL = '/api/accounting/v1/supplier-payments/';

describe('SupplierPaymentFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup() {
    TestBed.configureTestingModule({ imports: [SupplierPaymentFormComponent], providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(SupplierPaymentFormComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/supplier/').flush(envelope([{ id: 1, name: 'S3' }]));
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/supplier-invoice/' && r.params.get('dropdown') === 'true').flush(envelope([{ id: 7, invoice_number: 'SI-7' }]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('records a payment with allocations', () => {
    const component = setup().componentInstance;
    component.form.patchValue({ supplier: 1, amount: '75', payment_method: 'cash', reference: ' CASH-1 ' });
    component.addAllocation();
    component.allocations.at(0).patchValue({ invoice: 7, amount: '50' });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({ supplier: 1, amount: '75', payment_method: 'cash', reference: 'CASH-1', allocations: [{ invoice: 7, amount: '50' }] }),
    );
    req.flush(envelope(makeSupplierPayment()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/accounting/supplier-payments', 1]);
  });

  it('refuses allocations above the payment amount', () => {
    const component = setup().componentInstance;
    component.form.patchValue({ supplier: 1, amount: '40' });
    component.addAllocation();
    component.allocations.at(0).patchValue({ invoice: 7, amount: '50' });
    expect(component.overAllocated()).toBeTrue();
    component.submit();
    httpMock.expectNone((r) => r.method === 'POST');
  });
});
