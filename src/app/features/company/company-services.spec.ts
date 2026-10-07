import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { DepartmentService } from './departments/department.service';
import { PermissionGroupService } from './permission-groups/permission-group.service';
import { PermissionService } from './permissions/permission.service';
import { RoleService } from './roles/role.service';
import { TeamService } from './teams/team.service';
import { CompanyUserService } from './users/company-user.service';

describe('company resource services', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  const cases: Array<[string, () => { all(): import('rxjs').Observable<unknown> }]> = [
    ['/api/company/v1/departments/', () => TestBed.inject(DepartmentService)],
    ['/api/company/v1/teams/', () => TestBed.inject(TeamService)],
    ['/api/company/v1/roles/', () => TestBed.inject(RoleService)],
    ['/api/company/v1/permission-groups/', () => TestBed.inject(PermissionGroupService)],
    ['/api/company/v1/permissions/', () => TestBed.inject(PermissionService)],
    ['/api/company/v1/company-user/', () => TestBed.inject(CompanyUserService)],
  ];

  for (const [url, service] of cases) {
    it(`calls ${url}`, () => {
      service().all().subscribe();
      httpMock.expectOne(url).flush(envelope([]));
    });
  }
});
