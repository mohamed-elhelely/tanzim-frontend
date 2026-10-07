import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermissionGroup } from '../../../testing/company-fixtures';
import { PermissionGroupListComponent } from './permission-group-list.component';

const URL = '/api/company/v1/permission-groups/';

describe('PermissionGroupListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermissionGroupListComponent],
      providers: provideApiTesting(),
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(PermissionGroupListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows rows', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makePermissionGroup()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sales access');
  });

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermissionGroup()], 1));
    fixture.componentInstance.edit(makePermissionGroup());
    expect(router.navigate).toHaveBeenCalledWith(['/company/permission-groups', 4, 'edit']);
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermissionGroup()], 1));

    fixture.componentInstance.confirmDelete(makePermissionGroup());
    httpMock.expectOne(`${URL}4/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
