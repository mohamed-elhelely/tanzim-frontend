import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeZone } from '../../../testing/inventory-fixtures';
import { ZoneFormComponent } from './zone-form.component';

const URL = '/api/inventory/v1/zone/';
const WAREHOUSES = '/api/inventory/v1/warehouse/';

describe('ZoneFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [ZoneFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(ZoneFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function flushWarehouses() {
    httpMock.expectOne((r) => r.url === WAREHOUSES && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Main WH', code: 'WH-01' }]));
  }

  it('labels warehouses with their code and creates a zone', () => {
    const component = setup(null).componentInstance;
    flushWarehouses();
    expect(component.warehouseOptions()).toEqual([{ value: 1, label: 'Main WH (WH-01)' }]);
    component.form.patchValue({ warehouse: 1, name: ' Zone A ', code: 'Z-A' });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ warehouse: 1, name: 'Zone A', code: 'Z-A', description: '', is_active: true });
    req.flush(envelope(makeZone()), { status: 201, statusText: 'Created' });
  });

  it('on edit, keeps an unchanged code and description out of the PATCH', () => {
    const component = setup('1').componentInstance;
    flushWarehouses();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeZone()));
    httpMock.expectOne((r) => r.url === URL && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Zone A', code: 'Z-A' }]));
    component.submit();
    const req = httpMock.expectOne((r) => r.method === 'PATCH');
    expect(req.request.body).toEqual({ warehouse: 1, name: 'Zone A', is_active: true });
    req.flush(envelope(makeZone()));
  });
});
