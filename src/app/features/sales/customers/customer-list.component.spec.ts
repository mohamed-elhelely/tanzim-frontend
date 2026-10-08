import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCustomerListItem } from '../../../testing/sales-fixtures';
import { CustomerListComponent } from './customer-list.component';

const URL = '/api/sales/customers/';

describe('CustomerListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CustomerListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('loads a page (the backend only paginates when page is sent) and shows rows', () => {
    const fixture = TestBed.createComponent(CustomerListComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('page') === '1' && r.params.get('page_size') === '10')
      .flush(envelope([makeCustomerListItem(), makeCustomerListItem({ id: 2, name: 'Walk-in', available_credit: null })], 2));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Acme Trading');
    expect(text).toContain('CUST-00001');
    expect(text).toContain('724.00');
    expect(text).toContain('sales.hints.noCreditLimit');
  });

  it('filters by customer type and goes back to the first page', () => {
    const fixture = TestBed.createComponent(CustomerListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.table.first.set(10);
    fixture.componentInstance.onTypeChange('government');
    httpMock.expectOne((r) => r.url === URL && r.params.get('customer_type') === 'government' && r.params.get('page') === '1').flush(envelope([], 0));
  });

  it('shows the error state on 403', () => {
    const fixture = TestBed.createComponent(CustomerListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page', () => {
    const fixture = TestBed.createComponent(CustomerListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.edit(makeCustomerListItem({ id: 7 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/sales/customers', 7, 'edit']);
  });
});
