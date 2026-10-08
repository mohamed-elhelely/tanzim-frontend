import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeWarehouse } from '../../../testing/inventory-fixtures';
import { WarehouseFormComponent } from './warehouse-form.component';

const URL = '/api/inventory/v1/warehouse/';
const LOCATIONS = '/api/company/v1/location/';

describe('WarehouseFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [WarehouseFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(WarehouseFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function flushLocations() {
    httpMock.expectOne((r) => r.url === LOCATIONS && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name_en: 'Head office', name_ar: 'المقر' }]));
  }

  it('requires a code on create and sends the full body, without a manager', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    flushLocations();
    component.form.patchValue({ name: 'Main WH', location: 1, city: ' Riyadh ' });
    component.submit();
    fixture.detectChanges();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.nativeElement.textContent).toContain('validation.required');

    component.form.patchValue({ code: ' WH-01 ' });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual(jasmine.objectContaining({ name: 'Main WH', code: 'WH-01', location: 1, city: 'Riyadh', warehouse_type: 'central' }));
    expect('manager' in req.request.body).toBeFalse();
    req.flush(envelope(makeWarehouse()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/warehouses']);
  });

  it('on edit, fills the code from the dropdown and leaves untouched unreturned fields out of the PATCH', () => {
    const component = setup('1').componentInstance;
    flushLocations();
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeWarehouse({ use_bin_locations: false })));
    httpMock.expectOne((r) => r.url === URL && r.params.get('dropdown') === 'true').flush(envelope([{ id: 1, name: 'Main WH', code: 'WH-01' }]));
    expect(component.form.controls.code.value).toBe('WH-01');

    component.form.controls.phone.setValue('0555');
    component.form.controls.phone.markAsDirty();
    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body).toEqual({
      name: 'Main WH',
      warehouse_type: 'central',
      location: 1,
      phone: '0555',
      is_active: true,
      allow_negative_stock: false,
      use_bin_locations: false,
    });
    req.flush(envelope(makeWarehouse()));
  });

  it('shows a duplicate code under the field', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    flushLocations();
    component.form.patchValue({ name: 'WH2', code: 'WH-01' });
    component.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Invalid', { code: ['warehouse with this code already exists.'] }), { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('warehouse with this code already exists.');
  });
});
