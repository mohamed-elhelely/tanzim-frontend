import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeDebitNote } from '../../../testing/accounting-fixtures';
import { DebitNote } from '../accounting.models';
import { DebitNoteDetailComponent } from './debit-note-detail.component';

const URL = '/api/accounting/v1/debit-notes/';

describe('DebitNoteDetailComponent', () => {
  let httpMock: HttpTestingController;

  function setup(overrides: Partial<DebitNote> = {}) {
    TestBed.configureTestingModule({
      imports: [DebitNoteDetailComponent],
      providers: [...provideApiTesting(), { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = TestBed.createComponent(DebitNoteDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeDebitNote(overrides)));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('issues a draft, then offers cancel; cancels with a reason', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    expect(component.actions().map((a) => a.label)).toEqual(['common.edit', 'accounting.actions.issue', 'common.delete']);
    component.actions()[1].onClick();
    httpMock.expectOne(`${URL}1/issue/`).flush(envelope(makeDebitNote({ status: 'issued' })));
    expect(component.actions().map((a) => a.label)).toEqual(['accounting.actions.cancelNote']);
    component.onCancelConfirmed('Wrong supplier');
    const req = httpMock.expectOne(`${URL}1/cancel/`);
    expect(req.request.body).toEqual({ reason: 'Wrong supplier' });
    req.flush(envelope(makeDebitNote({ status: 'cancelled', cancel_reason: 'Wrong supplier' })));
    expect(component.actions()).toEqual([]);
  });
});
