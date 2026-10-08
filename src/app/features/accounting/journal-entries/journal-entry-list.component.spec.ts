import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeEntry } from '../../../testing/accounting-fixtures';
import { JournalEntryListComponent } from './journal-entry-list.component';

const URL = '/api/accounting/v1/journal-entries/';

describe('JournalEntryListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [JournalEntryListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('lists entries and sends the status, origin and date filters', () => {
    const fixture = TestBed.createComponent(JournalEntryListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeEntry({ source_type: 'SalesInvoice' })], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('JE-000022');
    expect(fixture.nativeElement.textContent).toContain('accounting.origins.automatic');
    const component = fixture.componentInstance;
    component.status = 'posted';
    component.origin = 'manual';
    component.startDate = '2026-10-01';
    component.onFilterChange();
    httpMock
      .expectOne(
        (r) =>
          r.url === URL &&
          r.params.get('status') === 'posted' &&
          r.params.get('automatic') === 'false' &&
          r.params.get('start_date') === '2026-10-01' &&
          !r.params.has('end_date'),
      )
      .flush(envelope([], 0));
  });
});
