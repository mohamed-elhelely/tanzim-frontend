import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCompanyUser } from '../../../testing/company-fixtures';
import { CompanyUser, CompanyUserPayload, SelectOption } from '../company.models';
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

  it('re-fetches the full record after create when the response has an id', () => {
    let result: CompanyUser | undefined;
    service.create(body).subscribe((u) => (result = u));

    httpMock.expectOne(URL).flush(envelope({ id: 12, user: body.user }), { status: 201, statusText: 'Created' });
    httpMock.expectOne(`${URL}12/`).flush(envelope(makeCompanyUser()));

    expect(result?.id).toBe(12);
    expect(result?.user.timezone).toBe('Asia/Riyadh');
  });

  it('finds the new record by email when the create response has no id', () => {
    let result: CompanyUser | undefined;
    service.create(body).subscribe((u) => (result = u));

    httpMock.expectOne((r) => r.url === URL && r.method === 'POST').flush(envelope({ user: body.user }));
    httpMock.expectOne((r) => r.url === URL && r.method === 'GET').flush(envelope([makeCompanyUser()]));

    expect(result?.id).toBe(12);
  });

  it('builds user options keyed by the login user id', () => {
    let options: SelectOption[] = [];
    service.userOptions().subscribe((o) => (options = o));
    httpMock.expectOne(URL).flush(envelope([makeCompanyUser()]));
    expect(options).toEqual([{ value: 9, label: 'Sara Ali (sara@acme.example)' }]);
  });
});
