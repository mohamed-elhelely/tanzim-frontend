import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeLedgerEntry } from '../../../testing/inventory-fixtures';
import { StockLedgerListComponent } from './stock-ledger-list.component';

const URL = '/api/inventory/v1/stock-ledger/';

describe('StockLedgerListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StockLedgerListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('loads the newest movements first and shows them signed', () => {
    const fixture = TestBed.createComponent(StockLedgerListComponent);
    fixture.detectChanges();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('ordering')).toBe('-created_at');
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makeLedgerEntry(), makeLedgerEntry({ id: 2, transaction_type: 'receipt', quantity: '5.000' })], 2));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Delivery Note DN-2026-00001');
    expect(text).toContain('inventory.ledgerTypes.issue');
    expect(text).toContain('+5');
    expect(text).toContain('Sara Ali');
  });

  it('searches by document type', fakeAsync(() => {
    const fixture = TestBed.createComponent(StockLedgerListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.componentInstance.table.onSearch('DeliveryNote');
    tick(300);
    httpMock.expectOne((r) => r.url === URL && r.params.get('search') === 'DeliveryNote').flush(envelope([], 0));
  }));
});
