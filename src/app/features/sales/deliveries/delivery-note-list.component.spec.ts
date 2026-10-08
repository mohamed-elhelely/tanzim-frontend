import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDeliveryNote } from '../../../testing/sales-fixtures';
import { DeliveryNoteListComponent } from './delivery-note-list.component';

const URL = '/api/sales/delivery-notes/';

describe('DeliveryNoteListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DeliveryNoteListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('shows notes and filters by status', () => {
    const fixture = TestBed.createComponent(DeliveryNoteListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeDeliveryNote({ status: 'in_transit', tracking_number: 'AWB-1' })], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('DN-2026-00001');
    expect(text).toContain('sales.deliveryStatuses.in_transit');
    expect(text).toContain('AWB-1');
    fixture.componentInstance.onStatusChange('delivered');
    httpMock.expectOne((r) => r.url === URL && r.params.get('status') === 'delivered').flush(envelope([], 0));
  });
});
