import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeChart, makeEntry } from '../../../testing/accounting-fixtures';
import { JournalEntryFormComponent } from './journal-entry-form.component';

const URL = '/api/accounting/v1/journal-entries/';

describe('JournalEntryFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [JournalEntryFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(JournalEntryFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('starts with two lines and offers only posting accounts', () => {
    const component = setup(null).componentInstance;
    httpMock.expectOne((r) => r.url === '/api/accounting/v1/accounts/').flush(envelope(makeChart()));
    expect(component.lines.length).toBe(2);
    expect(component.accountOptions().map((option) => option.value)).toEqual([2, 3, 11]);
  });

  it('refuses an unbalanced entry, balances the last line, and posts on "Save and post"', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    httpMock.expectOne((r) => r.url === '/api/accounting/v1/accounts/').flush(envelope(makeChart()));
    component.form.patchValue({ date: '2026-10-09', description: ' Rent ' });
    component.lines.at(0).patchValue({ account: 11, debit: '500' });
    component.lines.at(1).patchValue({ account: 3, credit: '400' });
    expect(component.totals().difference).toBe(100);
    component.submit(true);
    expect(component.balanceError()).toBeTrue();
    httpMock.expectNone((r) => r.method === 'POST');

    component.balanceLastLine();
    expect(component.lines.at(1).value.credit).toBe('500.00');
    expect(component.balanceError()).toBeFalse();
    component.submit(true);
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      date: '2026-10-09',
      description: 'Rent',
      reference: '',
      post: true,
      lines: [
        { account: 11, debit: '500', credit: '0', description: '' },
        { account: 3, debit: '0', credit: '500.00', description: '' },
      ],
    });
    req.flush(envelope(makeEntry({ status: 'posted' })), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/accounting/journal-entries', 22]);
  });

  it('flags a line with both or neither side filled', () => {
    const component = setup(null).componentInstance;
    httpMock.expectOne((r) => r.url === '/api/accounting/v1/accounts/').flush(envelope(makeChart()));
    component.lines.at(0).patchValue({ debit: '5', credit: '5' });
    expect(component.lines.at(0).hasError('oneSide')).toBeTrue();
    component.lines.at(0).patchValue({ credit: '' });
    expect(component.lines.at(0).hasError('oneSide')).toBeFalse();
  });

  it('edits a draft (PATCH with its lines)', () => {
    const component = setup('22').componentInstance;
    httpMock.expectOne((r) => r.url === '/api/accounting/v1/accounts/').flush(envelope(makeChart()));
    httpMock.expectOne(`${URL}22/`).flush(envelope(makeEntry()));
    expect(component.lines.at(0).getRawValue()).toEqual({ account: 11, debit: '500', credit: '', description: '' });
    component.submit(false);
    const req = httpMock.expectOne((r) => r.url === `${URL}22/` && r.method === 'PATCH');
    expect(req.request.body.post).toBeFalse();
    expect(req.request.body.lines.length).toBe(2);
    req.flush(envelope(makeEntry()));
  });

  it("won't edit a posted entry", () => {
    const fixture = setup('22');
    httpMock.expectOne((r) => r.url === '/api/accounting/v1/accounts/').flush(envelope(makeChart()));
    httpMock.expectOne(`${URL}22/`).flush(envelope(makeEntry({ status: 'posted' })));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('accounting.hints.onlyDraftEditable');
  });
});
