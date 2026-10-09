import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { signal } from '@angular/core';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { AccessService } from '../../../core/auth/access.service';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeSupplierReturn } from '../../../testing/returns-fixtures';
import { SupplierReturn } from '../returns.models';
import { SupplierReturnDetailComponent } from './supplier-return-detail.component';

const URL = '/api/returns/v1/supplier-returns/';

describe('SupplierReturnDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup(overrides: Partial<SupplierReturn> = {}, accounting = false) {
    const modules = signal(accounting);
    TestBed.configureTestingModule({
      imports: [SupplierReturnDetailComponent],
      providers: [
        ...provideApiTesting(),
        { provide: AccessService, useValue: { hasModule: (code: string) => code === 'accounting' && modules() } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = TestBed.createComponent(SupplierReturnDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeSupplierReturn(overrides)));
    fixture.detectChanges();
    return fixture;
  }

  const run = (fixture: ReturnType<typeof setup>, label: string) =>
    fixture.componentInstance.actions().find((a) => a.label === label)!.onClick();

  afterEach(() => httpMock.verify());

  it('shows the lines and the refund amount', () => {
    const fixture = setup({ refund_amount: '20.5000' });
    expect(fixture.nativeElement.textContent).toContain('20.50');
    expect(fixture.nativeElement.textContent).toContain('Phone X');
  });

  it('walks draft → approved → shipped → confirmed', () => {
    const fixture = setup();
    run(fixture, 'returns.actions.approve');
    httpMock.expectOne(`${URL}1/approve/`).flush(envelope(makeSupplierReturn({ status: 'approved' })));
    expect(fixture.componentInstance.actions().map((a) => a.label)).toEqual(['returns.actions.markShipped']);
    run(fixture, 'returns.actions.markShipped');
    httpMock.expectOne(`${URL}1/ship/`).flush(envelope(makeSupplierReturn({ status: 'shipped' })));
    run(fixture, 'returns.actions.confirmReceipt');
    httpMock.expectOne(`${URL}1/confirm_receipt/`).flush(envelope(makeSupplierReturn({ status: 'confirmed' })));
    expect(fixture.componentInstance.actions().map((a) => a.label)).toEqual(['returns.actions.closeSupplier']);
  });

  it('closes a confirmed return with the refund received', () => {
    const fixture = setup({ status: 'confirmed' });
    const component = fixture.componentInstance;
    run(fixture, 'returns.actions.closeSupplier');
    expect(component.refundAmount).toBe('20.00');
    component.refundAmount = 'abc';
    component.submitClose();
    expect(component.closeError()).toBe('returns.hints.refundAmount');
    component.refundAmount = '18.5';
    component.submitClose();
    const req = httpMock.expectOne(`${URL}1/close/`);
    expect(req.request.body).toEqual({ refund_amount: '18.5' });
    req.flush(envelope(makeSupplierReturn({ status: 'closed', refund_amount: '18.5000' })));
    expect(component.srn()?.status).toBe('closed');
    expect(component.closeDialogOpen()).toBeFalse();
    expect(component.actions()).toEqual([]);
  });

  it('offers "Raise debit note" on approved returns when accounting is on, and opens the draft', () => {
    expect(setup({ status: 'approved' }).componentInstance.actions().map((a) => a.label)).toEqual(['returns.actions.markShipped']);
    TestBed.resetTestingModule();
    const fixture = setup({ status: 'approved' }, true);
    expect(fixture.componentInstance.actions().map((a) => a.label)).toEqual(['returns.actions.markShipped', 'returns.actions.raiseDebitNote']);
    run(fixture, 'returns.actions.raiseDebitNote');
    const req = httpMock.expectOne('/api/accounting/v1/debit-notes/from-supplier-return/');
    expect(req.request.body).toEqual({ supplier_return: 1 });
    req.flush(envelope({ id: 9 }), { status: 201, statusText: 'Created' });
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/accounting/debit-notes', 9]);
  });
});
