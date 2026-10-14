import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccessService } from '../../../core/auth/access.service';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { AuditLogEntry, auditChangeRows, auditCompanyLabel, auditMetaRows } from './system-log.models';
import { SystemLogListComponent } from './system-log-list.component';

const URL = '/api/audit/v1/logs/';
const USERS = '/api/company/v1/company-user/';
const COMPANIES = '/api/company/v1/admin/company/';

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
    component.actions = ['delete', 'bulk_delete'];
    component.resources = ['salesorder'];
    component.dateFrom = '2026-10-01';
    component.dateTo = '2026-10-12';
    httpMock.expectNone(URL);

    component.table.apply();
    httpMock
      .expectOne(
        (r) =>
          r.url === URL &&
          r.params.get('user') === '4' &&
          r.params.get('action') === 'delete,bulk_delete' &&
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
    component.actions = ['delete'];
    component.sources = ['api', 'import'];
    component.table.apply('SO-2026');
    httpMock.expectOne((r) => r.url === URL && r.params.get('action') === 'delete').flush(envelope([], 0));
    component.actions = ['create'];

    component.export();
    expect(component.exporting()).toBeTrue();
    const req = httpMock.expectOne((r) => r.url === `${URL}export/`);
    expect(req.request.params.get('action')).toBe('delete');
    expect(req.request.params.get('source')).toBe('api,import');
    expect(req.request.params.get('search')).toBe('SO-2026');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
    expect(component.exporting()).toBeFalse();
  });

  it('opens the row at once, then shows the full entry with its details', () => {
    const fixture = create();
    fixture.nativeElement.querySelector('tbody tr').click();
    fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.selected()?.id).toBe(1);
    expect(component.loadingDetail()).toBeTrue();
    expect(document.body.textContent).toContain('confirmed');

    httpMock
      .expectOne(`${URL}1/`)
      .flush(envelope(makeLogEntry({ action: 'bulk_delete', changes: {}, meta: { count: 3, ids: [4, 5, 6] } })));
    fixture.detectChanges();
    expect(component.loadingDetail()).toBeFalse();
    expect(component.selected()?.meta?.count).toBe(3);
    expect(document.body.textContent).toContain('4, 5, 6');

    component.close();
    expect(component.selected()).toBeNull();
  });

  it('keeps the row when the full entry fails to load, and ignores a late answer for another row', () => {
    const fixture = create([makeLogEntry(), makeLogEntry({ id: 2 })]);
    const component = fixture.componentInstance;
    component.open(component.table.rows()[0]);
    component.open(component.table.rows()[1]);
    httpMock.expectOne(`${URL}1/`).flush(envelope(makeLogEntry({ object_repr: 'stale' })));
    expect(component.selected()?.id).toBe(2);
    httpMock.expectOne(`${URL}2/`).flush(errorEnvelope(404, 'Not found'), { status: 404, statusText: 'Not Found' });
    expect(component.selected()?.id).toBe(2);
    expect(component.loadingDetail()).toBeFalse();
  });

  it('puts saved comma-separated filters back into the multi-selects', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.actions = ['update', 'delete'];
    component.resources = ['salesorder', 'customer'];
    component.table.apply();
    httpMock.expectOne((r) => r.url === URL && r.params.get('resource') === 'salesorder,customer').flush(envelope([], 0));
    const saved = component.table.appliedQuery();

    component.table.clear();
    httpMock.expectOne((r) => r.url === URL && !r.params.has('action')).flush(envelope([], 0));
    expect(component.actions).toEqual([]);

    component.table.applyQuery(saved);
    httpMock.expectOne((r) => r.url === URL && r.params.get('action') === 'update,delete').flush(envelope([], 0));
    expect(component.actions).toEqual(['update', 'delete']);
    expect(component.resources).toEqual(['salesorder', 'customer']);
  });

  it('offers the new bulk create action', () => {
    const fixture = create();
    const action = fixture.componentInstance.actionOptions().find((option) => option.value === 'bulk_create');
    expect(action?.label).toBe('systemLogs.actions.bulk_create');
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

describe('SystemLogListComponent for platform staff', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemLogListComponent],
      providers: [...provideApiTesting(), { provide: AccessService, useValue: { isStaff: () => true } }],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('filters by company instead of user and shows the company of each row', () => {
    const fixture = TestBed.createComponent(SystemLogListComponent);
    fixture.detectChanges();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([makeLogEntry({ company: 7 })], 1));
    httpMock.expectOne(COMPANIES).flush(envelope([{ id: 7, name: 'Acme' }]));
    httpMock.expectNone((r) => r.url === USERS);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acme');

    const component = fixture.componentInstance;
    component.company = 7;
    component.table.apply();
    httpMock.expectOne((r) => r.url === URL && r.params.get('company') === '7').flush(envelope([], 0));
  });
});

describe('auditCompanyLabel', () => {
  it('uses the name on the row, then the known names, then the id', () => {
    const names = new Map([[7, 'Acme']]);
    expect(auditCompanyLabel({ id: 3, name: 'Beta' }, names)).toBe('Beta');
    expect(auditCompanyLabel(7, names)).toBe('Acme');
    expect(auditCompanyLabel(9, names)).toBe('9');
    expect(auditCompanyLabel(null, names)).toBe('—');
  });
});

describe('auditMetaRows', () => {
  it('labels count and ids, and translates known sign-in failure reasons', () => {
    expect(auditMetaRows({ count: 2, ids: [1, 2] })).toEqual([
      { labelKey: 'systemLogs.meta.count', value: '2' },
      { labelKey: 'systemLogs.meta.ids', value: '1, 2' },
    ]);
    expect(auditMetaRows({ reason: 'company_inactive' })).toEqual([
      { labelKey: 'systemLogs.meta.reason', value: 'systemLogs.reasons.company_inactive', translateValue: true },
    ]);
    expect(auditMetaRows({ reason: 'locked', file: 'x.xlsx' })).toEqual([
      { labelKey: 'systemLogs.meta.reason', value: 'locked' },
      { labelKey: 'file', value: 'x.xlsx' },
    ]);
    expect(auditMetaRows(null)).toEqual([]);
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
