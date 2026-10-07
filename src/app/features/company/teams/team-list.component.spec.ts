import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { Confirmation, ConfirmationService } from 'primeng/api';
import { envelope, provideApiTesting } from '../../../testing/api-testing';
import { SARA_REF, makeTeam } from '../../../testing/company-fixtures';
import { TeamListComponent } from './team-list.component';

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

  it('opens the edit page', () => {
    const fixture = create();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeTeam()], 1));
    fixture.componentInstance.edit(makeTeam());
    expect(router.navigate).toHaveBeenCalledWith(['/company/teams', 7, 'edit']);
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
