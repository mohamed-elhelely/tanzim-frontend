import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermission } from '../../../testing/company-fixtures';
import { PermissionListComponent } from './permission-list.component';

const URL = '/api/company/v1/permissions/';

describe('PermissionListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(PermissionListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows codename and group names', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makePermission({ groups: [{ id: 4, name_en: 'Sales access' }] })], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('sales.view');
    expect(fixture.nativeElement.textContent).toContain('Sales access');
  });

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermission()], 1));
    fixture.componentInstance.edit(makePermission());
    expect(router.navigate).toHaveBeenCalledWith(['/company/permissions', 6, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermission()], 1));
    fixture.componentInstance.confirmDelete(makePermission());
    httpMock.expectOne(`${URL}6/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
