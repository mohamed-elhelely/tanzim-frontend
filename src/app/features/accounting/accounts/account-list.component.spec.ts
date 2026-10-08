import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeAccount, makeChart } from '../../../testing/accounting-fixtures';
import { AccountListComponent, toTree } from './account-list.component';

const URL = '/api/accounting/v1/accounts/';

describe('toTree', () => {
  it('puts children under their parent, sorted by code, with their depth', () => {
    const rows = toTree([...makeChart()].reverse());
    expect(rows.map((row) => [row.code, row.depth])).toEqual([
      ['1000', 0],
      ['1100', 1],
      ['1110', 1],
      ['6000', 0],
      ['6200', 1],
    ]);
  });

  it('shows an account whose parent is missing at the top level', () => {
    expect(toTree([makeAccount({ id: 5, code: '5', parent: 99 })])[0].depth).toBe(0);
  });
});

describe('AccountListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [AccountListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('loads the whole chart and filters by type and search in the browser', () => {
    const fixture = TestBed.createComponent(AccountListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && !r.params.has('page')).flush(envelope(makeChart()));
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.rows().length).toBe(5);
    expect(fixture.nativeElement.textContent).toContain('accounting.hints.system');
    component.type.set('expense');
    expect(component.rows().map((row) => row.code)).toEqual(['6000', '6200']);
    component.type.set(null);
    component.search.set('11');
    expect(component.rows().map((row) => row.code)).toEqual(['1100', '1110']);
    component.search.set('rent');
    expect(component.rows().map((row) => [row.code, row.depth])).toEqual([['6200', 0]]);
  });

  it('hides delete on system accounts', () => {
    const fixture = TestBed.createComponent(AccountListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope(makeChart()));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.pi-trash').length).toBe(4);
  });
});
