import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeBrand } from '../../../testing/inventory-fixtures';
import { BrandFormComponent } from './brand-form.component';

const URL = '/api/inventory/v1/brand/';

describe('BrandFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [BrandFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(BrandFormComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('creates a brand with trimmed values and returns to the list', () => {
    const component = setup(null).componentInstance;
    component.form.setValue({ name: ' Acme ', description: ' Gadgets ', is_active: true });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({ name: 'Acme', description: 'Gadgets', is_active: true });
    req.flush(envelope(makeBrand()), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/inventory/brands']);
  });

  it('loads the brand in edit mode and shows a duplicate-name error', () => {
    const fixture = setup('1');
    const component = fixture.componentInstance;
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeBrand({ is_active: false })));
    expect(component.form.getRawValue()).toEqual({ name: 'Acme', description: 'Gadgets', is_active: false });
    component.submit();
    httpMock
      .expectOne((r) => r.url === `${URL}1/` && r.method === 'PATCH')
      .flush(errorEnvelope(400, 'Invalid', { non_field_errors: ['The fields company, name must make a unique set.'] }), {
        status: 400,
        statusText: 'Bad Request',
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('The fields company, name must make a unique set.');
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
