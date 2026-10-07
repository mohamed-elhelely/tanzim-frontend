import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { CrudApi } from './crud-api';

interface Thing {
  id: number;
  name_en: string;
}

interface ThingPayload {
  name_en: string;
}

@Injectable({ providedIn: 'root' })
class ThingApi extends CrudApi<Thing, ThingPayload> {
  protected readonly path = 'test/v1/things/';
}

const URL = '/api/test/v1/things/';

describe('CrudApi', () => {
  let api: ThingApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    api = TestBed.inject(ThingApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lists a page with paging, search and ordering params', () => {
    let result: unknown;
    api.list({ page: 2, pageSize: 25, search: 'sal', ordering: '-name_en' }).subscribe((r) => (result = r));

    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('page_size')).toBe('25');
    expect(req.request.params.get('search')).toBe('sal');
    expect(req.request.params.get('ordering')).toBe('-name_en');
    req.flush(envelope([{ id: 1, name_en: 'Sales' }], 31));

    expect(result).toEqual({ items: [{ id: 1, name_en: 'Sales' }], total: 31, page: 2, pageSize: 25 });
  });

  it('fetches every page for listAll', () => {
    let result: Thing[] = [];
    api.listAll().subscribe((r) => (result = r));

    const first = httpMock.expectOne((r) => r.url === URL && r.params.get('page') === '1');
    expect(first.request.params.get('page_size')).toBe('100');
    first.flush(envelope([{ id: 1, name_en: 'A' }], 201));

    const rest = httpMock.match((r) => r.url === URL);
    expect(rest.map((r) => r.request.params.get('page'))).toEqual(['2', '3']);
    rest[1].flush(envelope([{ id: 3, name_en: 'C' }], 201));
    rest[0].flush(envelope([{ id: 2, name_en: 'B' }], 201));

    expect(result.map((t) => t.id)).toEqual([1, 2, 3]);
  });

  it('makes a single request for listAll when everything fits on one page', () => {
    let result: Thing[] = [];
    api.listAll().subscribe((r) => (result = r));
    httpMock.expectOne((r) => r.url === URL).flush(envelope([{ id: 1, name_en: 'A' }], 1));
    expect(result.length).toBe(1);
  });

  it('omits empty search and ordering', () => {
    api.list({ page: 1, pageSize: 10, search: '', ordering: undefined }).subscribe();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.has('search')).toBeFalse();
    expect(req.request.params.has('ordering')).toBeFalse();
    req.flush(envelope([]));
  });

  it('falls back to the item count when total_count is missing', () => {
    let total = -1;
    api.list({ page: 1, pageSize: 10 }).subscribe((r) => (total = r.total));
    httpMock.expectOne((r) => r.url === URL).flush(envelope([{ id: 1, name_en: 'A' }]));
    expect(total).toBe(1);
  });

  it('loads the full list without params', () => {
    let items: Thing[] = [];
    api.all().subscribe((r) => (items = r));
    const req = httpMock.expectOne(URL);
    expect(req.request.params.keys().length).toBe(0);
    req.flush(envelope([{ id: 1, name_en: 'A' }]));
    expect(items.length).toBe(1);
  });

  it('loads the dropdown list with dropdown=true', () => {
    api.dropdown<{ id: number }>().subscribe();
    const req = httpMock.expectOne((r) => r.url === URL);
    expect(req.request.params.get('dropdown')).toBe('true');
    req.flush(envelope([]));
  });

  it('retrieves one record by id with a trailing slash', () => {
    let item: Thing | undefined;
    api.retrieve(5).subscribe((r) => (item = r));
    const req = httpMock.expectOne(`${URL}5/`);
    expect(req.request.method).toBe('GET');
    req.flush(envelope({ id: 5, name_en: 'Five' }));
    expect(item).toEqual({ id: 5, name_en: 'Five' });
  });

  it('creates with POST', () => {
    api.create({ name_en: 'New' }).subscribe();
    const req = httpMock.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ name_en: 'New' });
    req.flush(envelope({ id: 9, name_en: 'New' }), { status: 201, statusText: 'Created' });
  });

  it('updates with PATCH', () => {
    api.update(5, { name_en: 'Renamed' }).subscribe();
    const req = httpMock.expectOne(`${URL}5/`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name_en: 'Renamed' });
    req.flush(envelope({ id: 5, name_en: 'Renamed' }));
  });

  it('removes with DELETE and completes on 204', () => {
    let done = false;
    api.remove(5).subscribe({ complete: () => (done = true) });
    const req = httpMock.expectOne(`${URL}5/`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(done).toBeTrue();
  });
});
