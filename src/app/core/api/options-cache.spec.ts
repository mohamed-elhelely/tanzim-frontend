import { signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { OPTIONS_CACHE_TTL_MS, OptionsCache } from './options-cache';

describe('OptionsCache', () => {
  const user = signal<{ id: string } | null>({ id: '7' });
  let cache: OptionsCache;
  let loads: number;

  function load(value: string[] = ['a']): () => Observable<string[]> {
    return () => {
      loads++;
      return of(value);
    };
  }

  beforeEach(() => {
    user.set({ id: '7' });
    loads = 0;
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user } }] });
    cache = TestBed.inject(OptionsCache);
    TestBed.tick();
  });

  it('loads once and serves the same list until it expires', fakeAsync(() => {
    let result: string[] = [];
    cache.get('inventory/v1/brand/', {}, load(['Bosch'])).subscribe((v) => (result = v));
    cache.get('inventory/v1/brand/', {}, load(['Bosch'])).subscribe();
    expect(result).toEqual(['Bosch']);
    expect(loads).toBe(1);

    tick(OPTIONS_CACHE_TTL_MS - 1);
    cache.get('inventory/v1/brand/', {}, load()).subscribe();
    expect(loads).toBe(1);

    tick(1);
    cache.get('inventory/v1/brand/', {}, load()).subscribe();
    expect(loads).toBe(2);
  }));

  it('keeps a separate entry per filter set', () => {
    cache.get('inventory/v1/zone/', { warehouse: 1 }, load()).subscribe();
    cache.get('inventory/v1/zone/', { warehouse: 2 }, load()).subscribe();
    cache.get('inventory/v1/zone/', { warehouse: 1 }, load()).subscribe();
    expect(loads).toBe(2);
  });

  it('shares one request between callers while it is in flight', () => {
    const response = new Subject<string[]>();
    const loader = () => {
      loads++;
      return response;
    };
    const seen: string[][] = [];
    cache.get('x/', {}, loader).subscribe((v) => seen.push(v));
    cache.get('x/', {}, loader).subscribe((v) => seen.push(v));
    response.next(['one']);
    response.complete();
    expect(loads).toBe(1);
    expect(seen).toEqual([['one'], ['one']]);
  });

  it('does not keep a failed load', () => {
    cache.get('x/', {}, () => {
      loads++;
      return throwError(() => new Error('boom'));
    }).subscribe({ error: () => undefined });
    cache.get('x/', {}, load()).subscribe();
    expect(loads).toBe(2);
  });

  it('drops every entry of a resource written to, before the time is up', () => {
    cache.get('inventory/v1/brand/', {}, load()).subscribe();
    cache.get('inventory/v1/brand/', { is_active: 'true' }, load()).subscribe();
    cache.get('inventory/v1/category/', {}, load()).subscribe();

    cache.invalidate('inventory/v1/brand/3/');
    cache.get('inventory/v1/brand/', {}, load()).subscribe();
    cache.get('inventory/v1/brand/', { is_active: 'true' }, load()).subscribe();
    cache.get('inventory/v1/category/', {}, load()).subscribe();
    expect(loads).toBe(3 + 2);
  });

  it('a write to a custom action or an import of the resource also drops it', () => {
    cache.get('sales/v1/sales-order/', {}, load()).subscribe();
    cache.invalidate('sales/v1/sales-order/5/confirm/');
    cache.get('sales/v1/sales-order/', {}, load()).subscribe();
    expect(loads).toBe(2);
  });

  it('a supplier payment drops the open supplier invoices list', () => {
    cache.get('inventory/v1/supplier-invoice/', { supplier: 3, open: 'true' }, load()).subscribe();
    cache.invalidate('accounting/v1/supplier-payments/');
    cache.get('inventory/v1/supplier-invoice/', { supplier: 3, open: 'true' }, load()).subscribe();
    expect(loads).toBe(2);
  });

  it('forgets everything when the signed-in user changes', () => {
    cache.get('x/', {}, load()).subscribe();
    user.set({ id: '8' });
    TestBed.tick();
    cache.get('x/', {}, load()).subscribe();
    expect(loads).toBe(2);
  });

  it('tells other tabs and drops what another tab wrote to', () => {
    const posted: unknown[] = [];
    const channel = (cache as unknown as { channel: BroadcastChannel | null }).channel;
    expect(channel).not.toBeNull();
    spyOn(channel as BroadcastChannel, 'postMessage').and.callFake((m: unknown) => posted.push(m));

    cache.invalidate('inventory/v1/brand/');
    expect(posted).toEqual(['inventory/v1/brand/']);

    cache.get('inventory/v1/category/', {}, load()).subscribe();
    (channel as BroadcastChannel).onmessage?.(new MessageEvent('message', { data: 'inventory/v1/category/9/' }));
    cache.get('inventory/v1/category/', {}, load()).subscribe();
    expect(loads).toBe(2);
  });
});
