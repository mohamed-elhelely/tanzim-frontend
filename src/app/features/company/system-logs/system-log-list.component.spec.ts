import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { AuditLogEntry, auditChangeRows } from './system-log.models';
import { SystemLogListComponent } from './system-log-list.component';

const URL = '/api/audit/v1/logs/';
const USERS = '/api/company/v1/company-user/';

function makeLogEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: 1,
    timestamp: '2026-10-12T09:15:02Z',
    action: 'update',
    source: 'api',
    user: { id: 4, email: 'sara@acme.test', first_name: 'Sara', last_name: 'Ali' },
    resource: 'salesorder',
    object_id: '245',
    object_repr: 'SO-2026-00012',
    changes: { status: ['draft', 'confirmed'] },
    ip_address: '196.221.10.4',
    user_agent: 'Mozilla/5.0',
    request_id: 'abc',
    ...overrides,
  };
}

describe('SystemLogListComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [SystemLogListComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function create(rows: AuditLogEntry[] = [makeLogEntry()]) {
    const fixture = TestBed.createComponent(SystemLogListComponent);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url === URL && r.params.get('page') === '1' && r.params.get('ordering') === '-timestamp')
      .flush(envelope(rows, rows.length));
    httpMock
      .expectOne((r) => r.url === USERS && r.params.get('dropdown') === 'true')
      .flush(envelope([{ id: 1, user: { id: 4, email: 'sara@acme.test', first_name: 'Sara', last_name: 'Ali' } }]));
    fixture.detectChanges();
    return fixture;
  }

  it('lists who changed what, newest first', () => {
    const fixture = create();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sara Ali');
    expect(text).toContain('systemLogs.actions.update');
    expect(text).toContain('nav.salesOrders');
    expect(text).toContain('SO-2026-00012');
    expect(text).toContain('status');
    expect(fixture.componentInstance.userOptions().length).toBe(1);
  });

  it('shows changes made by the system without a user', () => {
    const fixture = create([makeLogEntry({ user: null, source: 'task' })]);
    expect(fixture.nativeElement.textContent).toContain('systemLogs.systemUser');
  });

  it('sends the filters only when applied', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.user = 4;
    component.action = 'delete';
    component.resource = 'salesorder';
    component.dateFrom = '2026-10-01';
    component.dateTo = '2026-10-12';
    httpMock.expectNone(URL);

    component.table.apply();
    httpMock
      .expectOne(
        (r) =>
          r.url === URL &&
          r.params.get('user') === '4' &&
          r.params.get('action') === 'delete' &&
          r.params.get('resource') === 'salesorder' &&
          r.params.get('date_from') === '2026-10-01' &&
          r.params.get('date_to') === '2026-10-12',
      )
      .flush(envelope([], 0));

    component.table.clear();
    httpMock.expectOne((r) => r.url === URL && !r.params.has('action') && !r.params.has('user')).flush(envelope([], 0));
    expect(component.dateFrom).toBe('');
  });

  it('exports the applied search and filters', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.action = 'delete';
    component.table.apply('SO-2026');
    httpMock.expectOne((r) => r.url === URL && r.params.get('action') === 'delete').flush(envelope([], 0));
    component.action = 'create';

    component.export();
    expect(component.exporting()).toBeTrue();
    const req = httpMock.expectOne((r) => r.url === `${URL}export/`);
    expect(req.request.params.get('action')).toBe('delete');
    expect(req.request.params.get('search')).toBe('SO-2026');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
    expect(component.exporting()).toBeFalse();
  });

  it('opens the change details', () => {
    const fixture = create();
    fixture.nativeElement.querySelector('tbody tr').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selected()?.id).toBe(1);
    expect(document.body.textContent).toContain('confirmed');
    fixture.componentInstance.close();
    expect(fixture.componentInstance.selected()).toBeNull();
  });

  it('shows the error state on 403', () => {
    const fixture = TestBed.createComponent(SystemLogListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    httpMock.expectOne((r) => r.url === USERS).flush(envelope([]));
    fixture.detectChanges();
    expect(fixture.componentInstance.table.error()?.status).toBe(403);
  });
});

describe('auditChangeRows', () => {
  it('turns field changes into before/after rows', () => {
    expect(auditChangeRows({ status: ['draft', 'confirmed'], notes: [null, 'Rush'] })).toEqual([
      { field: 'status', before: 'draft', after: 'confirmed' },
      { field: 'notes', before: '—', after: 'Rush' },
    ]);
  });

  it('lists many-to-many changes as removed and added', () => {
    expect(auditChangeRows({ permissions: { added: ['view_brand', 'add_brand'], removed: [] } })).toEqual([
      { field: 'permissions', before: '—', after: 'view_brand, add_brand' },
    ]);
  });

  it('handles a missing changes object', () => {
    expect(auditChangeRows(null)).toEqual([]);
  });
});
