import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCompanyUser } from '../../../testing/company-fixtures';
import { CompanyUserCreated, CompanyUserPayload, SelectOption } from '../company.models';
import { CompanyUserService } from './company-user.service';

const URL = '/api/company/v1/company-user/';

describe('CompanyUserService', () => {
  let service: CompanyUserService;
  let httpMock: HttpTestingController;

  const body: CompanyUserPayload = {
    user: { email: 'Sara@Acme.example', first_name: 'Sara', last_name: 'Ali', password: 'Passw0rd!' },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    service = TestBed.inject(CompanyUserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('creates with a single POST and returns the short create response', () => {
    // The backend's create response has no id; nothing needs the full record, so there is no re-fetch
    // that could fail after the user was already created.
    let result: CompanyUserCreated | undefined;
    service.create(body).subscribe((u) => (result = u));

    const created = { user: { email: body.user.email, first_name: 'Sara', last_name: 'Ali' }, role: null };
    httpMock.expectOne((r) => r.url === URL && r.method === 'POST').flush(envelope(created), {
      status: 201,
      statusText: 'Created',
    });

    expect(result?.user.email).toBe(body.user.email);
  });

  it('builds user options from the dropdown (no view permission needed), keyed by the login user id', () => {
    let options: SelectOption[] = [];
    service.userOptions().subscribe((o) => (options = o));
    httpMock.expectOne((r) => r.url === URL && r.params.get('dropdown') === 'true').flush(envelope([makeCompanyUser()]));
    expect(options).toEqual([{ value: 9, label: 'Sara Ali (sara@acme.example)' }]);
  });
});
