import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeSupplierReturn } from '../../../testing/returns-fixtures';
import { SupplierReturn } from '../returns.models';
import { SupplierReturnDetailComponent } from './supplier-return-detail.component';

const URL = '/api/returns/v1/supplier-returns/';

describe('SupplierReturnDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup(overrides: Partial<SupplierReturn> = {}) {
    TestBed.configureTestingModule({
      imports: [SupplierReturnDetailComponent],
      providers: [
        ...provideApiTesting(),
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

  it('shows the lines and their total', () => {
    const fixture = setup();
    expect(fixture.componentInstance.linesTotal()).toBe(20);
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
    expect(fixture.componentInstance.actions()).toEqual([]);
  });
});
