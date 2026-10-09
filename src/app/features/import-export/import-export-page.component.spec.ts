import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AccessService } from '../../core/auth/access.service';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { NotificationService } from '../../core/services/notification.service';
import { ImportExportPageComponent } from './import-export-page.component';

const TASKS = '/api/common/v1/tasks/';
const IMPORT = '/api/inventory/v1/category/import/';

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

  it('exports the chosen format', () => {
    const component = setup().componentInstance;
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(HTMLAnchorElement.prototype, 'click');
    component.onResourceChange('category');
    component.format = 'xlsx';
    component.exportData();
    const req = httpMock.expectOne((r) => r.url === '/api/inventory/v1/category/export/' && r.params.get('format') === 'xlsx');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('refuses files that are not CSV or Excel', () => {
    const component = setup().componentInstance;
    component.onResourceChange('category');
    component.onFilePicked({ target: { files: [new File(['x'], 'notes.txt')], value: 'notes.txt' } } as unknown as Event);
    expect(component.file()).toBeNull();
    expect(component.fileError()).toBe('importExport.hints.fileType');
  });

  it('checks the file first and only allows importing when no row has errors', async () => {
    const component = setup().componentInstance;
    component.onResourceChange('category');
    component.onFilePicked({ target: { files: [new File(['name,parent\nA,\n'], 'cats.csv')], value: '' } } as unknown as Event);
    expect(component.canImport()).toBeFalse();

    await component.checkFile();
    let req = httpMock.expectOne(IMPORT);
    expect(req.request.body).toEqual({ file: 'data:text/csv;base64,' + btoa('name,parent\nA,\n'), dry_run: true });
    req.flush(
      envelope({
        success: true,
        dry_run: true,
        task_id: 't1',
        stats: { new: 1, updated: 0, errors: 1, skipped: 0, warnings: 0 },
        preview: [
          { row: 1, status: 'new', data: { name: 'A' }, error: null, warning: null },
          { row: 2, status: 'errors', data: { name: 'B' }, error: 'Bad parent', warning: null },
        ],
      }),
    );
    httpMock.expectOne((r) => r.url === TASKS).flush(envelope([], 0));
    expect(component.canImport()).toBeFalse();

    await component.checkFile();
    httpMock.expectOne(IMPORT).flush(envelope({ success: true, dry_run: true, task_id: 't2', stats: { new: 1, updated: 0, errors: 0, skipped: 0, warnings: 0 }, preview: [] }));
    httpMock.expectOne((r) => r.url === TASKS).flush(envelope([], 0));
    expect(component.canImport()).toBeTrue();

    await component.importFile();
    req = httpMock.expectOne(IMPORT);
    expect(req.request.body.dry_run).toBeFalse();
    req.flush(envelope({ success: true, dry_run: false, task_id: 't3', stats: { new: 1, updated: 0, errors: 0, skipped: 0, warnings: 0 } }), { status: 201, statusText: 'Created' });
    httpMock.expectOne((r) => r.url === TASKS).flush(envelope([], 0));
    expect(component.lastImport()?.stats.new).toBe(1);
    expect(component.file()).toBeNull();
    expect(notifications.success).toHaveBeenCalled();
  });

  it('shows the header problem as a readable toast', async () => {
    const component = setup().componentInstance;
    component.onResourceChange('category');
    component.onFilePicked({ target: { files: [new File(['name\n'], 'cats.csv')], value: '' } } as unknown as Event);
    await component.checkFile();
    httpMock
      .expectOne(IMPORT)
      .flush(errorEnvelope(400, 'Unknown error', { error: "[ErrorDetail(string='Missing required headers: parent', code='invalid')]" } as never), {
        status: 400,
        statusText: 'Bad Request',
      });
    expect(notifications.error).toHaveBeenCalledWith('Missing required headers: parent');
    expect(component.checking()).toBeFalse();
  });

  it('filters the history by type', () => {
    const component = setup().componentInstance;
    component.taskType = 'export';
    component.onTaskTypeChange();
    httpMock.expectOne((r) => r.url === TASKS && r.params.get('type') === 'export').flush(envelope([], 0));
  });
});
