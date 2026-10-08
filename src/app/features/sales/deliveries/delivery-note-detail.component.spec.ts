import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDeliveryNote } from '../../../testing/sales-fixtures';
import { DeliveryNote } from '../sales.models';
import { DeliveryNoteDetailComponent } from './delivery-note-detail.component';

const URL = '/api/sales/delivery-notes/';

describe('DeliveryNoteDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup(overrides: Partial<DeliveryNote> = {}) {
    TestBed.configureTestingModule({
      imports: [DeliveryNoteDetailComponent],
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
    const fixture = TestBed.createComponent(DeliveryNoteDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeDeliveryNote(overrides)));
    fixture.detectChanges();
    return fixture;
  }

  const labels = (fixture: ReturnType<typeof setup>) => fixture.componentInstance.actions().map((a) => a.label);
  const run = (fixture: ReturnType<typeof setup>, label: string) =>
    fixture.componentInstance.actions().find((a) => a.label === label)!.onClick();

  afterEach(() => httpMock.verify());

  it('shows the note, its order and lines', () => {
    const text = setup().nativeElement.textContent;
    expect(text).toContain('DN-2026-00001');
    expect(text).toContain('SO-2026-00001');
    expect(text).toContain('Phone X');
  });

  it('offers the next workflow step for each status (pick-ups skip the carrier)', () => {
    expect(labels(setup())).toEqual(['sales.actions.editDetails', 'sales.actions.confirmDelivery']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'confirmed' }))).toEqual(['sales.actions.handToCarrier']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'confirmed', shipping_method: 'pickup' }))).toEqual(['sales.actions.markDelivered']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'in_transit' }))).toEqual(['sales.actions.markDelivered', 'sales.actions.markFailed']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'delivered' }))).toEqual([]);
  });

  it('confirms a draft', () => {
    const fixture = setup();
    run(fixture, 'sales.actions.confirmDelivery');
    httpMock.expectOne(`${URL}1/confirm_delivery/`).flush(envelope(makeDeliveryNote({ status: 'confirmed' })));
    expect(fixture.componentInstance.note()?.status).toBe('confirmed');
  });

  it('saves the details of a draft with PATCH and reloads', () => {
    const fixture = setup();
    run(fixture, 'sales.actions.editDetails');
    const component = fixture.componentInstance;
    expect(component.form.carrier).toBe('Aramex');
    component.form.shipping_method = 'pickup';
    component.form.notes = ' Collected ';
    component.saveCarrier();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body).toEqual({ shipping_method: 'pickup', carrier: 'Aramex', tracking_number: '', notes: 'Collected' });
    req.flush(envelope({ id: 1 }));
    httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'GET').flush(envelope(makeDeliveryNote({ shipping_method: 'pickup' })));
    expect(component.carrierDialog()).toBeNull();
  });

  it('hands over to the carrier with the tracking number', () => {
    const fixture = setup({ status: 'confirmed' });
    run(fixture, 'sales.actions.handToCarrier');
    fixture.componentInstance.form.tracking_number = 'AWB-1';
    fixture.componentInstance.saveCarrier();
    const req = httpMock.expectOne(`${URL}1/ship/`);
    expect(req.request.body).toEqual({ carrier: 'Aramex', tracking_number: 'AWB-1' });
    req.flush(envelope(makeDeliveryNote({ status: 'in_transit' })));
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeDeliveryNote({ status: 'in_transit' })));
  });

  it('records a failed delivery with its reason', () => {
    const fixture = setup({ status: 'in_transit' });
    fixture.componentInstance.onFailConfirmed('Wrong address');
    const req = httpMock.expectOne(`${URL}1/mark_failed/`);
    expect(req.request.body).toEqual({ reason: 'Wrong address' });
    req.flush(envelope(makeDeliveryNote({ status: 'failed' })));
    expect(fixture.componentInstance.note()?.status).toBe('failed');
  });
});
