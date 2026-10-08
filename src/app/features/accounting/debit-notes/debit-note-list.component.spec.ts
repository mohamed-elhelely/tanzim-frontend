import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDebitNote, makeSupplierPayment } from '../../../testing/accounting-fixtures';
import { SupplierPaymentListComponent } from '../supplier-payments/supplier-payment-list.component';
import { DebitNoteListComponent } from './debit-note-list.component';

describe('Payables lists', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DebitNoteListComponent, SupplierPaymentListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('lists debit notes and filters by status', () => {
    const fixture = TestBed.createComponent(DebitNoteListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/accounting/v1/debit-notes/' && r.params.get('page') === '1').flush(envelope([makeDebitNote()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('DBN-00001');
    fixture.componentInstance.status = 'issued';
    fixture.componentInstance.onFilterChange();
    httpMock.expectOne((r) => r.url === '/api/accounting/v1/debit-notes/' && r.params.get('status') === 'issued').flush(envelope([], 0));
  });

  it('lists supplier payments and filters by status and method', () => {
    const fixture = TestBed.createComponent(SupplierPaymentListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/accounting/v1/supplier-payments/').flush(envelope([makeSupplierPayment()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SP-00001');
    fixture.componentInstance.status = 'voided';
    fixture.componentInstance.method = 'cash';
    fixture.componentInstance.onFilterChange();
    httpMock
      .expectOne((r) => r.url === '/api/accounting/v1/supplier-payments/' && r.params.get('status') === 'voided' && r.params.get('payment_method') === 'cash')
      .flush(envelope([], 0));
  });
});
