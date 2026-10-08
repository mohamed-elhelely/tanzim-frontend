import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeWarehouse } from '../../../testing/inventory-fixtures';
import { WarehouseListComponent } from './warehouse-list.component';

const URL = '/api/inventory/v1/warehouse/';

describe('WarehouseListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [WarehouseListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  it('shows the page, with codes taken from the dropdown (the list has none)', () => {
    const fixture = TestBed.createComponent(WarehouseListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeWarehouse()], 1));
    httpMock.expectOne((r) => r.url === URL && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Main WH', code: 'WH-01' }]));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('WH-01');
    expect(text).toContain('Main WH');
    expect(text).toContain('inventory.warehouseTypes.central');
    expect(text).toContain('Head office');
  });

  it('still shows the rows when the dropdown fails', () => {
    const fixture = TestBed.createComponent(WarehouseListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.has('page')).flush(envelope([makeWarehouse()], 1));
    httpMock.expectOne((r) => r.params.get('dropdown') === 'true').flush(null, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Main WH');
  });
});
