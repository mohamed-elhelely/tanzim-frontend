import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makeRole } from '../../../testing/company-fixtures';
import { RoleListComponent } from './role-list.component';

const URL = '/api/company/v1/roles/';

describe('RoleListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RoleListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(RoleListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows permission group names', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makeRole({ permission_groups: [{ id: 1, name_en: 'Group 0' }] })], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sales Manager');
    expect(fixture.nativeElement.textContent).toContain('Group 0');
  });

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeRole()], 1));
    fixture.componentInstance.edit(makeRole());
    expect(router.navigate).toHaveBeenCalledWith(['/company/roles', 3, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeRole()], 1));
    fixture.componentInstance.confirmDelete(makeRole());
    httpMock.expectOne(`${URL}3/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
