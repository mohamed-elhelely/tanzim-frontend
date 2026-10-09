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

  it('shows the page with the code of each row', () => {
    const fixture = TestBed.createComponent(WarehouseListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([makeWarehouse({ code: 'WH-01' })], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('WH-01');
    expect(text).toContain('Main WH');
    expect(text).toContain('inventory.warehouseTypes.central');
    expect(text).toContain('Head office');
  });
});
