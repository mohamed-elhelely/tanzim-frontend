import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeAccount, makeChart } from '../../../testing/accounting-fixtures';
import { AccountFormComponent } from './account-form.component';

const URL = '/api/accounting/v1/accounts/';

describe('AccountFormComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  function setup(id: string | null) {
    TestBed.configureTestingModule({
      imports: [AccountFormComponent],
      providers: [
        ...provideApiTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(AccountFormComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL && r.method === 'GET').flush(envelope(makeChart()));
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('offers only group accounts of the chosen type as parents, and clears a parent of another type', () => {
    const component = setup(null).componentInstance;
    expect(component.parentOptions().map((option) => option.value)).toEqual([1]);
    component.form.controls.parent.setValue(1);
    component.form.controls.account_type.setValue('expense');
    expect(component.parentOptions().map((option) => option.value)).toEqual([10]);
    expect(component.form.controls.parent.value).toBeNull();
  });

  it('creates an account', () => {
    const component = setup(null).componentInstance;
    component.form.patchValue({ code: ' 6990 ', name: 'Office supplies', account_type: 'expense', parent: 10 });
    component.submit();
    const req = httpMock.expectOne((r) => r.url === URL && r.method === 'POST');
    expect(req.request.body).toEqual({
      code: '6990',
      name: 'Office supplies',
      account_type: 'expense',
      parent: 10,
      is_group: false,
      is_active: true,
      description: '',
    });
    req.flush(envelope(makeAccount({ id: 30 })), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/accounting/accounts']);
  });

  it("locks a system account's type and keeps it out of its own parent list", () => {
    const component = setup('1').componentInstance;
    expect(component.parentOptions().map((option) => option.value)).toEqual([]);
    TestBed.resetTestingModule();
    const system = setup('2').componentInstance;
    expect(system.form.controls.account_type.disabled).toBeTrue();
    system.submit();
    const req = httpMock.expectOne((r) => r.url === `${URL}2/` && r.method === 'PATCH');
    expect(req.request.body.account_type).toBe('asset');
    req.flush(envelope(makeChart()[1]));
  });

  it('shows the duplicate-code error under the field', () => {
    const component = setup(null).componentInstance;
    component.form.patchValue({ code: '1100', name: 'Petty cash' });
    component.submit();
    httpMock
      .expectOne((r) => r.method === 'POST')
      .flush(errorEnvelope(400, 'Unknown error', { code: ['An account with this code exists'] }), { status: 400, statusText: 'Bad Request' });
    expect(component.form.controls.code.errors?.['serverError']).toBe('An account with this code exists');
  });
});
