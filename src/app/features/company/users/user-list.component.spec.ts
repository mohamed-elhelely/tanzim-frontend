import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { makeCompanyUser, makeRole } from '../../../testing/company-fixtures';
import { UserListComponent } from './user-list.component';

const URL = '/api/company/v1/company-user/';

describe('UserListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [UserListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(UserListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the full user list without paging params', () => {
    const fixture = create();
    const req = httpMock.expectOne(URL);
    expect(req.request.params.keys().length).toBe(0);
    req.flush(envelope([makeCompanyUser({ role: makeRole(), is_company_admin: true })]));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sara Ali');
    expect(text).toContain('sara@acme.example');
    expect(text).toContain('Sales Manager');
  });

  it('shows the forbidden state on 403', () => {
    const fixture = create();
    httpMock.expectOne(URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('common.forbidden');
  });

  it('opens the edit page with the company-user id', () => {
    const fixture = create();
    httpMock.expectOne(URL).flush(envelope([makeCompanyUser()]));
    fixture.componentInstance.edit(makeCompanyUser());
    expect(router.navigate).toHaveBeenCalledWith(['/company/users', 12, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne(URL).flush(envelope([makeCompanyUser()]));
    fixture.componentInstance.confirmDelete(makeCompanyUser());
    httpMock.expectOne(`${URL}12/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne(URL).flush(envelope([]));
  });
});
