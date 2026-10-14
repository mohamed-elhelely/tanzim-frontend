import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeOrderListItem } from '../../../testing/sales-fixtures';
import { SalesOrderListComponent } from './sales-order-list.component';

const URL = '/api/sales/sales-orders/';

describe('SalesOrderListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SalesOrderListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('confirms only the ticked drafts, one by one, then reloads', () => {
    let accept: (() => void) | undefined;
    spyOn(TestBed.inject(ConfirmationService), 'confirm').and.callFake((c: Confirmation) => {
      accept = c.accept as () => void;
      return TestBed.inject(ConfirmationService);
    });
    const fixture = TestBed.createComponent(SalesOrderListComponent);
    fixture.detectChanges();
    const draft = makeOrderListItem({ id: 1 });
    const confirmed = makeOrderListItem({ id: 2, status: 'confirmed' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([draft, confirmed], 2));
    const component = fixture.componentInstance;

    component.table.selection.set([draft, confirmed]);
    expect(component.selectedDrafts()).toEqual([draft]);
    component.confirmSelected();
    accept?.();
    httpMock.expectOne((r) => r.url === `${URL}1/confirm/` && r.method === 'POST').flush(envelope({ id: 1, status: 'confirmed' }));
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([], 0));
    expect(component.table.selection()).toEqual([]);
  });

  it('shows orders with status, total and a delete button only for drafts', () => {
    const fixture = TestBed.createComponent(SalesOrderListComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('page') === '1')
      .flush(envelope([makeOrderListItem(), makeOrderListItem({ id: 2, order_number: 'SO-2026-00002', status: 'confirmed' })], 2));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('SO-2026-00001');
    expect(text).toContain('sales.orderStatuses.confirmed');
    expect(text).toContain('232.00 SAR');
    expect(fixture.nativeElement.querySelectorAll('.pi-trash').length).toBe(1);
  });

  it('filters by status', () => {
    const fixture = TestBed.createComponent(SalesOrderListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.status = ['shipped'];
    fixture.componentInstance.table.apply();
    httpMock.expectOne((r) => r.url === URL && r.params.get('status') === 'shipped').flush(envelope([], 0));
  });

  it('opens the order', () => {
    const fixture = TestBed.createComponent(SalesOrderListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.open(makeOrderListItem({ id: 3 }));
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(['/sales/orders', 3]);
  });
});
