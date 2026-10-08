import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCustomerReturn } from '../../../testing/returns-fixtures';
import { CustomerReturnListComponent } from './customer-return-list.component';

const URL = '/api/returns/v1/customer-returns/';

describe('CustomerReturnListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CustomerReturnListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('shows returns and combines the status and reason filters', () => {
    const fixture = TestBed.createComponent(CustomerReturnListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeCustomerReturn()], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('RMA-2026-00001');
    expect(text).toContain('returns.reasons.defective');
    expect(text).toContain('returns.customerStatuses.requested');
    fixture.componentInstance.status = 'approved';
    fixture.componentInstance.reason = 'wrong_item';
    fixture.componentInstance.onFilterChange();
    httpMock.expectOne((r) => r.url === URL && r.params.get('status') === 'approved' && r.params.get('return_reason') === 'wrong_item').flush(envelope([], 0));
    fixture.componentInstance.open(makeCustomerReturn({ id: 4 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/returns/customer', 4]);
  });
});
