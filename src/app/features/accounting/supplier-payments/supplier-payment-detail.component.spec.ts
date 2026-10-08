import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeSupplierPayment } from '../../../testing/accounting-fixtures';
import { SupplierPaymentDetailComponent } from './supplier-payment-detail.component';

const URL = '/api/accounting/v1/supplier-payments/';

describe('SupplierPaymentDetailComponent', () => {
  it('voids a completed payment with a reason, then offers nothing more', () => {
    TestBed.configureTestingModule({
      imports: [SupplierPaymentDetailComponent],
      providers: [...provideApiTesting(), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }],
    });
    const httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(SupplierPaymentDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeSupplierPayment()));
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.actions().map((a) => a.label)).toEqual(['accounting.actions.void']);
    expect(fixture.nativeElement.textContent).toContain('accounting.hints.noAllocations');
    component.onVoidConfirmed('Entered twice');
    const req = httpMock.expectOne(`${URL}1/void/`);
    expect(req.request.body).toEqual({ reason: 'Entered twice' });
    req.flush(envelope(makeSupplierPayment({ status: 'voided', void_reason: 'Entered twice' })));
    expect(component.actions()).toEqual([]);
    httpMock.verify();
  });
});
