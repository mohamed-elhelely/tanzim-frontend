import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccessService } from '../../../core/auth/access.service';
import { envelope, errorEnvelope, provideApiTesting } from '../../../testing/api-testing';
import { AuditLogEntry } from './system-log.models';
import { RecordHistoryComponent } from './record-history.component';

const URL = '/api/audit/v1/logs/';

const entry = (id: number, overrides: Partial<AuditLogEntry> = {}): AuditLogEntry => ({
  id,
  timestamp: '2026-10-12T09:15:02Z',
  action: 'update',
  source: 'api',
  user: { id: 4, email: 'sara@acme.test', first_name: 'Sara', last_name: 'Ali' },
  resource: 'salesorder',
  object_id: '245',
  object_repr: 'SO-2026-00012',
  changes: { status: ['draft', 'confirmed'] },
  ip_address: null,
  user_agent: '',
  request_id: '',
  ...overrides,
});

describe('RecordHistoryComponent', () => {
  let httpMock: HttpTestingController;
  let canRead: boolean;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RecordHistoryComponent], providers: provideApiTesting() }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
    canRead = true;
    spyOn(TestBed.inject(AccessService), 'can').and.callFake((codename: string) => codename === 'view_auditlog' && canRead);
  });

  afterEach(() => httpMock.verify());

  function create() {
    const fixture = TestBed.createComponent(RecordHistoryComponent);
    fixture.componentRef.setInput('resource', 'salesorder');
    fixture.componentRef.setInput('objectId', 245);
    fixture.detectChanges();
    return fixture;
  }

  it('is hidden without view_auditlog', () => {
    canRead = false;
    const fixture = create();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('loads nothing until opened, then the record history newest first', () => {
    const fixture = create();
    httpMock.expectNone(URL);

    fixture.nativeElement.querySelector('button').click();
    httpMock
      .expectOne(
        (r) =>
          r.url === URL &&
          r.params.get('resource') === 'salesorder' &&
          r.params.get('object_id') === '245' &&
          r.params.get('ordering') === '-timestamp' &&
          r.params.get('page') === '1',
      )
      .flush(envelope([entry(1)], 1));
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sara Ali');
    expect(text).toContain('confirmed');
    expect(fixture.componentInstance.hasMore()).toBeFalse();
  });

  it('pages with "show more" and does not reload when reopened', () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.toggle();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1').flush(envelope([entry(1)], 2));
    expect(component.hasMore()).toBeTrue();

    component.loadMore();
    httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '2').flush(envelope([entry(2)], 2));
    expect(component.entries().map((e) => e.id)).toEqual([1, 2]);

    component.toggle();
    component.toggle();
    httpMock.expectNone(URL);
  });

  it('shows an empty message and errors', () => {
    const fixture = create();
    fixture.componentInstance.toggle();
    httpMock.expectOne((r) => r.url === URL).flush(envelope([], 0));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('systemLogs.noHistory');

    fixture.componentInstance.loadMore();
    httpMock.expectOne((r) => r.url === URL).flush(errorEnvelope(403, 'Forbidden'), { status: 403, statusText: 'Forbidden' });
    expect(fixture.componentInstance.error()?.status).toBe(403);
  });
});
