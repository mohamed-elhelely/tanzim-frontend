import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AccessService } from '../../core/auth/access.service';
import { NotificationService } from '../../core/services/notification.service';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { ImportExportActionsComponent } from './import-export-actions.component';

const IMPORT = '/api/inventory/v1/category/import/';

describe('ImportExportActionsComponent', () => {
  let httpMock: HttpTestingController;
  let notifications: jasmine.SpyObj<NotificationService>;

  function setup(resource = 'category', modules: string[] = ['inventory'], permissions: string[] = []) {
    notifications = jasmine.createSpyObj('NotificationService', ['success', 'error', 'failure']);
    TestBed.configureTestingModule({
      imports: [ImportExportActionsComponent],
      providers: [
        ...provideApiTesting(),
        { provide: NotificationService, useValue: notifications },
        { provide: AccessService, useValue: { hasModule: (code: string) => modules.includes(code), can: (code: string) => permissions.includes(code) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ImportExportActionsComponent);
    fixture.componentRef.setInput('resource', resource);
    fixture.detectChanges();
    return fixture;
  }

  function pick(name: string, content = 'name,parent\nA,\n'): Event {
    return { target: { files: [new File([content], name)], value: name } } as unknown as Event;
  }

  afterEach(() => httpMock.verify());

  it('shows the buttons only with the resource module or permission', () => {
    expect(setup('category', ['inventory']).nativeElement.querySelectorAll('button').length).toBe(3);
    TestBed.resetTestingModule();
    expect(setup('category', []).nativeElement.querySelectorAll('button').length).toBe(0);
    TestBed.resetTestingModule();
    expect(setup('department', [], ['add_department']).componentInstance.allowed()).toBeTrue();
  });

  it('exports the chosen format', () => {
    const component = setup().componentInstance;
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(HTMLAnchorElement.prototype, 'click');
    component.exportData('xlsx');
    const req = httpMock.expectOne((r) => r.url === '/api/inventory/v1/category/export/' && r.params.get('format') === 'xlsx');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('downloads the template', () => {
    const component = setup().componentInstance;
    spyOn(URL, 'createObjectURL').and.returnValue('blob:x');
    spyOn(HTMLAnchorElement.prototype, 'click');
    component.downloadTemplate();
    const req = httpMock.expectOne(`${IMPORT}?template=true`);
    expect(req.request.method).toBe('POST');
    req.flush(new Blob(['x']));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it('refuses files that are not CSV or Excel', async () => {
    const component = setup().componentInstance;
    await component.onFilePicked(pick('notes.txt'));
    expect(notifications.error).toHaveBeenCalledWith('importExport.hints.fileType');
  });

  it('imports straight away without a check and tells the page', async () => {
    const component = setup().componentInstance;
    let imported = false;
    component.imported.subscribe(() => (imported = true));

    await component.onFilePicked(pick('cats.csv'));
    const req = httpMock.expectOne(IMPORT);
    expect(req.request.body).toEqual({ file: 'data:text/csv;base64,' + btoa('name,parent\nA,\n'), dry_run: false });
    req.flush(envelope({ success: true, dry_run: false, task_id: 't1', stats: { new: 1, updated: 0, errors: 0, skipped: 0, warnings: 0 } }), {
      status: 201,
      statusText: 'Created',
    });

    expect(imported).toBeTrue();
    expect(notifications.success).toHaveBeenCalled();
    expect(component.failure()).toBeNull();
  });

  it('lists the rows with errors in the dialog when the import fails', async () => {
    const component = setup().componentInstance;
    let imported = false;
    component.imported.subscribe(() => (imported = true));

    await component.onFilePicked(pick('cats.csv'));
    httpMock.expectOne(IMPORT).flush(
      errorEnvelope(400, 'Unknown error', {
        success: false,
        stats: { new: 1, updated: 0, errors: 1, skipped: 0, warnings: 0 },
        error_message: 'Import failed with 1 errors',
        detailed_results: [
          { row: 1, status: 'new', data: { name: 'A' }, error: null, warning: null },
          { row: 2, status: 'errors', data: { name: 'B' }, error: "Could not find Category 'Nowhere'", warning: null },
        ],
      }),
      { status: 400, statusText: 'Bad Request' },
    );

    const failure = component.failure()!;
    expect(imported).toBeFalse();
    expect(component.failedFile()).toBe('cats.csv');
    expect(failure.message).toBe('Import failed with 1 errors');
    expect(failure.stats?.errors).toBe(1);
    expect(component.visibleRows(failure).map((row) => row.row)).toEqual([2]);
    component.onlyProblems = false;
    expect(component.visibleRows(failure).length).toBe(2);
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('shows a file the backend cannot read in the dialog with its message', async () => {
    const component = setup().componentInstance;
    await component.onFilePicked(pick('cats.csv', 'name\n'));
    httpMock.expectOne(IMPORT).flush(errorEnvelope(400, 'Missing required headers: parent'), { status: 400, statusText: 'Bad Request' });

    expect(component.failure()).toEqual({ message: 'Missing required headers: parent', stats: null, rows: [] });
    expect(component.importing()).toBeFalse();
  });
});
