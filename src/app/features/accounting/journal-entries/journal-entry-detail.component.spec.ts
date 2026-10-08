import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { BehaviorSubject } from 'rxjs';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeEntry } from '../../../testing/accounting-fixtures';
import { JournalEntry } from '../accounting.models';
import { JournalEntryDetailComponent } from './journal-entry-detail.component';

const URL = '/api/accounting/v1/journal-entries/';

describe('JournalEntryDetailComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(overrides: Partial<JournalEntry> = {}) {
    TestBed.configureTestingModule({
      imports: [JournalEntryDetailComponent],
      providers: [...provideApiTesting(), { provide: ActivatedRoute, useValue: { paramMap: new BehaviorSubject(convertToParamMap({ id: '22' })) } }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = TestBed.createComponent(JournalEntryDetailComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${URL}22/`).flush(envelope(makeEntry(overrides)));
    fixture.detectChanges();
    return fixture;
  }

  const labels = (fixture: ReturnType<typeof setup>) => fixture.componentInstance.actions().map((a) => a.label);

  afterEach(() => httpMock.verify());

  it('offers edit / post / delete on drafts, reverse on posted entries, nothing once reversed', () => {
    expect(labels(setup())).toEqual(['common.edit', 'accounting.actions.post', 'common.delete']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'posted' }))).toEqual(['accounting.actions.reverse']);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'posted', reversed_by: 23 }))).toEqual([]);
    TestBed.resetTestingModule();
    expect(labels(setup({ status: 'posted', reversal_of: 21 }))).toEqual([]);
  });

  it('posts a draft', () => {
    const fixture = setup();
    fixture.componentInstance.actions()[1].onClick();
    httpMock.expectOne(`${URL}22/post/`).flush(envelope(makeEntry({ status: 'posted' })));
    expect(fixture.componentInstance.entry()?.status).toBe('posted');
  });

  it('reverses and opens the new entry', () => {
    const fixture = setup({ status: 'posted' });
    fixture.componentInstance.reverseDescription = ' Wrong account ';
    fixture.componentInstance.submitReverse();
    const req = httpMock.expectOne(`${URL}22/reverse/`);
    expect(req.request.body).toEqual({ description: 'Wrong account' });
    req.flush(envelope(makeEntry({ id: 23, status: 'posted', reversal_of: 22 })), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/accounting/journal-entries', 23]);
  });
});
