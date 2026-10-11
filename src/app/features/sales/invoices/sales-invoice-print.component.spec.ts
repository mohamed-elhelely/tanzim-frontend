import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { AccessService } from '../../../core/auth/access.service';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeInvoice } from '../../../testing/sales-fixtures';
import { SalesInvoicePrintComponent } from './sales-invoice-print.component';

const URL = '/api/sales/sales-invoices/9/';

describe('SalesInvoicePrintComponent', () => {
  let httpMock: HttpTestingController;
  let print: jasmine.Spy;

  function setup(query: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      imports: [SalesInvoicePrintComponent],
      providers: [
        ...provideApiTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '9' }), queryParamMap: convertToParamMap(query) } },
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
    const fixture = TestBed.createComponent(SalesInvoicePrintComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('lays out the invoice with the company name, lines and totals', () => {
    const fixture = setup();
    httpMock.expectOne(URL).flush(envelope(makeInvoice({ id: 9 })));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    const invoice = fixture.componentInstance.invoice()!;
    expect(text).toContain('Acme Trading');
    expect(text).toContain(invoice.invoice_number);
    expect(text).toContain(invoice.customer_name);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(invoice.lines.length);
    expect(print).not.toHaveBeenCalled();
  });

  it('opens the print dialog by itself with ?print=1', fakeAsync(() => {
    setup({ print: '1' });
    httpMock.expectOne(URL).flush(envelope(makeInvoice({ id: 9 })));
    tick(500);
    expect(print).toHaveBeenCalled();
  }));

  it('shows the error state when the invoice cannot be loaded', () => {
    const fixture = setup({ print: '1' });
    httpMock.expectOne(URL).flush(errorEnvelope(404, 'Not found'), { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(fixture.componentInstance.error()?.status).toBe(404);
    expect(print).not.toHaveBeenCalled();
  });
});
