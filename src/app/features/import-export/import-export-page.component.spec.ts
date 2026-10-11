import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AccessService } from '../../core/auth/access.service';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { NotificationService } from '../../core/services/notification.service';
import { ImportExportPageComponent } from './import-export-page.component';

const TASKS = '/api/common/v1/tasks/';

describe('ImportExportPageComponent', () => {
  let httpMock: HttpTestingController;
  let notifications: jasmine.SpyObj<NotificationService>;

  function setup(modules: string[] = ['inventory', 'location'], permissions: string[] = ['add_department']) {
    const mods = signal(modules);
    notifications = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    TestBed.configureTestingModule({
      imports: [ImportExportPageComponent],
      providers: [
        ...provideApiTesting(),
        { provide: NotificationService, useValue: notifications },
        { provide: AccessService, useValue: { hasModule: (code: string) => mods().includes(code), can: (code: string) => permissions.includes(code) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ImportExportPageComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === TASKS && r.params.get('page') === '1').flush(envelope([], 0));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('lists only the resources allowed by module and permission, grouped', () => {
    const component = setup(['inventory'], ['add_department']).componentInstance;
    const groups = component.resourceOptions().map((group) => group.label);
    expect(groups).toEqual(['importExport.groups.company', 'importExport.groups.inventory']);
    expect(component.resources().map((r) => r.key)).toContain('department');
    expect(component.resources().map((r) => r.key)).not.toContain('team');
    expect(component.resources().map((r) => r.key)).not.toContain('city');
  });

  it('filters the history by type', () => {
    const component = setup().componentInstance;
    component.taskType = 'export';
    component.onTaskTypeChange();
    httpMock.expectOne((r) => r.url === TASKS && r.params.get('type') === 'export').flush(envelope([], 0));
  });
});
