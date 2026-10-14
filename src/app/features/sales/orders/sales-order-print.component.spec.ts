import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AccessService } from '../../../core/auth/access.service';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeOrder } from '../../../testing/sales-fixtures';
import { SalesOrderPrintComponent } from './sales-order-print.component';

const URL = '/api/sales/sales-orders/4/';

describe('SalesOrderPrintComponent', () => {
  let httpMock: HttpTestingController;

  function setup() {
    TestBed.configureTestingModule({
      imports: [SalesOrderPrintComponent],
      providers: [
        ...provideApiTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '4' }), queryParamMap: convertToParamMap({}) } },
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
    const fixture = TestBed.createComponent(SalesOrderPrintComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('prints a draft as a quotation and a confirmed order as an order confirmation', () => {
    let fixture = setup();
    httpMock.expectOne(URL).flush(envelope(makeOrder({ id: 4, status: 'draft' })));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('print.quotation');

    TestBed.resetTestingModule();
    fixture = setup();
    httpMock.expectOne(URL).flush(envelope(makeOrder({ id: 4, status: 'confirmed', internal_notes: 'Do not show' })));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('print.orderConfirmation');
    expect(text).toContain('Acme Trading');
    expect(text).not.toContain('Do not show');
  });
});
