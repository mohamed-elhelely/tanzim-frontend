import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeReservation, makeValuation } from '../../../testing/inventory-fixtures';
import { StockReservation } from '../inventory.models';
import { StockLevelsComponent } from './stock-levels.component';

const REPORT = '/api/reports/v1/run/inventory_valuation/';
const RESERVATIONS = '/api/inventory/v1/stock-reservation/';

describe('StockLevelsComponent', () => {
  let httpMock: HttpTestingController;

  function setup(reservations: StockReservation[] = [makeReservation(), makeReservation({ id: 2, quantity: '4.000', is_released: true })]) {
    TestBed.configureTestingModule({ imports: [StockLevelsComponent], providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StockLevelsComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === '/api/inventory/v1/warehouse/' && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, name: 'Main WH', code: 'MAIN' }, { id: 2, name: 'Branch', code: 'BR1' }]));
    httpMock
      .expectOne((r) => r.url === '/api/inventory/v1/product-variant/' && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, sku: 'PX-RED-128', name: 'Phone X Red 128' }]));
    httpMock.expectOne((r) => r.url === RESERVATIONS).flush(envelope(reservations, reservations.length));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('shows on-hand stock with what open reservations hold and what is left', () => {
    const fixture = setup();
    const req = httpMock.expectOne((r) => r.url === REPORT);
    expect(req.request.params.get('method')).toBe('AVERAGE');
    expect(req.request.params.has('warehouse')).toBeFalse();
    req.flush(envelope(makeValuation()));
    fixture.detectChanges();
    // The table sorts by SKU, so look the rows up by variant.
    const byId = (id: number) => fixture.componentInstance.rows().find((row) => row.variant_id === id);
    const [red, blue] = [byId(1), byId(2)];
    // The released reservation of 4 doesn't count.
    expect(red).toEqual(jasmine.objectContaining({ variantName: 'Phone X Red 128', reserved: 3, available: 7 }));
    expect(blue).toEqual(jasmine.objectContaining({ reserved: 0, available: 0 }));
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('5,000.00');
    expect(text).toContain('inventory.stock.outOfStock');
  });

  it('runs for one warehouse and a past date, without reservations', () => {
    const fixture = setup([makeReservation({ warehouse: { id: 2, name: 'Branch', code: 'BR1' } })]);
    httpMock.expectOne((r) => r.url === REPORT).flush(envelope(makeValuation()));
    const component = fixture.componentInstance;
    // Today, for Main WH only: the Branch reservation doesn't count.
    component.warehouse = 1;
    component.run();
    httpMock.expectOne((r) => r.url === REPORT && r.params.get('warehouse') === '1').flush(envelope(makeValuation()));
    expect(component.rows()[0].reserved).toBe(0);

    component.asOfDate = '2026-10-01';
    component.method = 'FIFO';
    component.run();
    const req = httpMock.expectOne((r) => r.url === REPORT);
    expect(req.request.params.get('as_of_date')).toBe('2026-10-01');
    expect(req.request.params.get('method')).toBe('FIFO');
    req.flush(envelope(makeValuation()));
    expect(component.isCurrent()).toBeFalse();
    expect(component.rows()[0].reserved).toBeNull();
  });

  it('filters the rows by SKU, variant or product', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === REPORT).flush(envelope(makeValuation()));
    const component = fixture.componentInstance;
    component.search.set('blu');
    expect(component.rows().map((row) => row.variant_id)).toEqual([2]);
    component.search.set('red 128');
    expect(component.rows().map((row) => row.variant_id)).toEqual([1]);
  });

  it('shows the error when the report fails', () => {
    const fixture = setup();
    httpMock.expectOne((r) => r.url === REPORT).flush(errorEnvelope(400, 'warehouse not found'), { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('warehouse not found');
  });
});
