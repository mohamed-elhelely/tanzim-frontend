import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AccessService } from '../../../core/auth/access.service';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDeliveryNote } from '../../../testing/sales-fixtures';
import { DeliveryNotePrintComponent } from './delivery-note-print.component';

const URL = '/api/sales/delivery-notes/3/';

describe('DeliveryNotePrintComponent', () => {
  let httpMock: HttpTestingController;
  let print: jasmine.Spy;

  function setup(query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [DeliveryNotePrintComponent],
      providers: [
        ...provideApiTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '3' }), queryParamMap: convertToParamMap(query) } },
        },
        {
          provide: AccessService,
          useValue: {
            load: () => of(undefined),
            current: () => ({ company: { id: 1, name: 'Acme Trading', logo: null, primary_color: '#123456', secondary_color: '#000000' } }),
          },
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    print = spyOn(window, 'print');
    const fixture = TestBed.createComponent(DeliveryNotePrintComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('lists what was shipped with room for signatures', () => {
    const fixture = setup();
    httpMock.expectOne(URL).flush(envelope(makeDeliveryNote({ id: 3 })));
    fixture.detectChanges();
    const note = fixture.componentInstance.note()!;
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Acme Trading');
    expect(text).toContain(note.delivery_number);
    expect(text).toContain('print.receivedBy');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(note.lines.length);
  });

  it('marks a failed delivery and prints by itself with ?print=1', fakeAsync(() => {
    const fixture = setup({ print: '1' });
    httpMock.expectOne(URL).flush(envelope(makeDeliveryNote({ id: 3, status: 'failed' })));
    expect(fixture.componentInstance.warningKey()).toBe('sales.deliveryStatuses.failed');
    tick(500);
    expect(print).toHaveBeenCalled();
  }));
});
