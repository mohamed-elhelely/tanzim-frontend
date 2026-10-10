import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { makePermission } from '../../../testing/company-fixtures';
import { PermissionListComponent } from './permission-list.component';
import { EMPTY } from 'rxjs';
import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { PermissionFormComponent } from './permission-form.component';

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

  it('searches by name and codename', fakeAsync(() => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermission()], 1));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type="search"]')).not.toBeNull();
    fixture.componentInstance.table.onSearch('team');
    tick(300);
    httpMock.expectOne((r) => r.url === URL && r.params.get('search') === 'team').flush(envelope([], 0));
  }));

  it('cancels the older list request when a newer one starts', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermission()], 30));
    fixture.componentInstance.table.onLazyLoad({ first: 10, rows: 10 });
    fixture.componentInstance.table.onLazyLoad({ first: 20, rows: 10 });

    const requests = httpMock.match((r) => r.url === URL);
    expect(requests.length).toBe(2);
    expect(requests[0].cancelled).toBeTrue();
    expect(requests[1].request.params.get('page')).toBe('3');
    requests[1].flush(envelope([], 30));
  });

  it('opens the edit form in a dialog', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makePermission()], 1));
    const open = spyOn(TestBed.inject(FormDialogService), 'open').and.returnValue(EMPTY);
    fixture.componentInstance.edit(makePermission());
    expect(open).toHaveBeenCalledWith(PermissionFormComponent, { header: 'company.permissions.edit', id: 6 });
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
