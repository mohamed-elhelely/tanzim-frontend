import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { SARA_REF, makeTeam } from '../../../testing/company-fixtures';
import { TeamListComponent } from './team-list.component';
import { EMPTY } from 'rxjs';
import { FormDialogService } from '../../../shared/forms/form-dialog.service';
import { TeamFormComponent } from './team-form.component';

const URL = '/api/company/v1/teams/';

describe('TeamListComponent', () => {
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TeamListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(TeamListComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('loads the first page and shows department, location and leads', () => {
    const fixture = create();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('page')).toBe('1');
    req.flush(envelope([makeTeam({ leads: [SARA_REF] })], 1));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('B2B Team');
    expect(text).toContain('Sales');
    expect(text).toContain('Head Office (HQ-01)');
    expect(text).toContain('Sara Ali');
  });

  it('cancels the older list request when a newer one starts', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeTeam()], 30));
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
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeTeam()], 1));
    const open = spyOn(TestBed.inject(FormDialogService), 'open').and.returnValue(EMPTY);
    fixture.componentInstance.edit(makeTeam());
    expect(open).toHaveBeenCalledWith(TeamFormComponent, { header: 'company.teams.edit', id: 7 });
  });

  it('deletes after confirmation and reloads', () => {
    const confirmation = TestBed.inject(ConfirmationService);
    spyOn(confirmation, 'confirm').and.callFake((c: Confirmation) => {
      c.accept?.();
      return confirmation;
    });
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeTeam()], 1));
    fixture.componentInstance.confirmDelete(makeTeam());
    httpMock.expectOne(`${URL}7/`).flush(null, { status: 204, statusText: 'No Content' });
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
  });
});
