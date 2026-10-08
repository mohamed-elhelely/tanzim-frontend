import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDebitNote } from '../../../testing/accounting-fixtures';
import { makeSupplierReturn } from '../../../testing/returns-fixtures';
import { DebitNoteFormComponent } from './debit-note-form.component';

const URL = '/api/accounting/v1/debit-notes/';

describe('DebitNoteFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [DebitNoteFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(DebitNoteFormComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/supplier/').flush(envelope([{ id: 1, name: 'S3' }]));
    httpMock.expectOne((r) => r.url === '/api/inventory/v1/supplier-invoice/').flush(envelope([]));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it("loads the supplier's returns and creates a note", () => {
    const component = setup(null).componentInstance;
    component.form.controls.supplier.setValue(1);
    component.onSupplierChange(1);
    httpMock.expectOne((r) => r.url === '/api/returns/v1/supplier-returns/' && r.params.get('supplier') === '1').flush(envelope([makeSupplierReturn()]));
    expect(component.returns().length).toBe(1);
    component.form.patchValue({ supplier_return: 1, subtotal: '20', reason: ' Overcharge ' });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({ supplier: 1, supplier_return: 1, supplier_invoice: null, subtotal: '20', tax_amount: '0', reason: 'Overcharge' }),
    );
    req.flush(envelope(makeDebitNote({ id: 4 })), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/accounting/debit-notes', 4]);
  });

  it('edits a draft and refuses an issued note', () => {
    const component = setup('1').componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeDebitNote()));
    httpMock.expectOne((r) => r.url === '/api/returns/v1/supplier-returns/').flush(envelope([makeSupplierReturn()]));
    expect(component.form.controls.supplier_return.value).toBe(1);
    component.submit();
    httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH').flush(envelope(makeDebitNote()));
    TestBed.resetTestingModule();
    const issued = setup('1');
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeDebitNote({ status: 'issued' })));
    issued.detectChanges();
    expect(issued.componentInstance.notDraft()).toBeTrue();
  });
});
