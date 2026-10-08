import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeBin, makeZone } from '../../../testing/inventory-fixtures';
import { BinFormComponent } from './bin-form.component';

const URL = '/api/inventory/v1/bin/';
const ZONES = '/api/inventory/v1/zone/';

describe('BinFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [BinFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(BinFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  function flushZones() {
    httpMock.expectOne((r) => r.url === ZONES && r.params.get('page_size') === '100').flush(envelope([makeZone()], 1));
  }

  it('labels zones with their warehouse and sends an empty capacity as null', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    flushZones();
    expect(component.zoneOptions()).toEqual([{ value: 1, label: 'Main WH › Zone A' }]);

    component.form.patchValue({ zone: 1, name: 'Bin 1', max_capacity: '1.2345' });
    component.submit();
    fixture.detectChanges();
    httpMock.expectNone((r) => r.method === 'POST');
    expect(fixture.nativeElement.textContent).toContain('inventory.hints.decimal');

    component.form.patchValue({ max_capacity: '' });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body.max_capacity).toBeNull();
    req.flush(envelope(makeBin()), { status: 201, statusText: 'Created' });
  });
});
