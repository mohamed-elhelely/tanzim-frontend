import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeSupplier } from '../../../testing/inventory-fixtures';
import { SupplierFormComponent } from './supplier-form.component';

const URL = '/api/inventory/v1/supplier/';

describe('SupplierFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [SupplierFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(SupplierFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('starts with the backend defaults and converts numbers and currency', () => {
    const component = setup(null).componentInstance;
    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({ currency: 'USD', lead_time_days: '0', reliability_score: '0' }));
    component.form.patchValue({ name: 'Gulf Supply', currency: 'sar', credit_limit: '5000', lead_time_days: '7', reliability_score: '0.8' });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({ currency: 'SAR', credit_limit: '5000', lead_time_days: 7, reliability_score: 0.8, supplier_type: 'distributor' }),
    );
    req.flush(envelope(makeSupplier()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/suppliers']);
  });

  it('rejects a reliability above 1, a bad website and a bad currency before sending', () => {
    const fixture = setup(null);
    const component = fixture.componentInstance;
    component.form.patchValue({ name: 'S', reliability_score: '4.5', website: 'g.com', currency: 'RIYAL' });
    component.submit();
    fixture.detectChanges();
    httpMock.expectNone((r) => r.method === 'POST');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('inventory.hints.reliability');
    expect(text).toContain('inventory.hints.website');
    expect(text).toContain('inventory.hints.currency');
  });

  it('on edit, sends only the returned fields plus what the user changed', () => {
    const component = setup('1').componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeSupplier()));
    expect(component.form.controls.currency.value).toBe('');
    component.form.controls.email.setValue('sales@gulf.example');
    component.form.controls.email.markAsDirty();
    component.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH');
    expect(req.request.body).toEqual({
      name: 'Gulf Supply',
      supplier_type: 'distributor',
      email: 'sales@gulf.example',
      credit_limit: '5000.00',
      lead_time_days: 7,
      is_preferred: true,
      is_active: true,
    });
    req.flush(envelope(makeSupplier()));
  });
});
