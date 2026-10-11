import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { provideApiTesting } from '../../testing/api-testing';
import { SavedViewsComponent } from './saved-views.component';
import { SavedViewsService } from './saved-views.service';
import { ServerTable } from './server-table';

const page = { items: [], total: 0, page: 1, pageSize: 10 };

describe('SavedViewsService', () => {
  let service: SavedViewsService;
  const user = signal<{ id: string } | null>({ id: '4' });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: { user } }] });
    service = TestBed.inject(SavedViewsService);
  });

  afterEach(() => localStorage.clear());

  it('saves per user and screen, newest first, replacing a view of the same name', () => {
    service.save('sales-order', 'Drafts', { filters: { status: 'draft' } });
    service.save('sales-order', 'Shipped', { filters: { status: 'shipped' } });
    service.save('sales-order', 'Drafts', { search: 'acme', filters: { status: 'draft' } });
    expect(service.list('sales-order').map((view) => view.name)).toEqual(['Drafts', 'Shipped']);
    expect(service.list('sales-order')[0].query.search).toBe('acme');
    expect(service.list('customer')).toEqual([]);

    user.set({ id: '5' });
    expect(service.list('sales-order')).toEqual([]);
    user.set({ id: '4' });
  });

  it('removes a view and survives broken storage', () => {
    service.save('city', 'Cairo', { search: 'cairo', filters: {} });
    expect(service.remove('city', 'Cairo')).toEqual([]);

    localStorage.setItem('tanzim.views.4.city', '{not json');
    expect(service.list('city')).toEqual([]);
  });
});

describe('SavedViewsComponent', () => {
  @Component({
    selector: 'app-host',
    imports: [SavedViewsComponent],
    template: '<app-saved-views [table]="table" screen="sales-order"></app-saved-views>',
  })
  class HostComponent {
    status: string | null = null;
    readonly fetch = jasmine.createSpy('fetch').and.returnValue(of(page));
    readonly table = new ServerTable<unknown>(this.fetch, {
      filters: () => ({ status: this.status }),
      reset: () => (this.status = null),
      restore: (filters) => (this.status = (filters['status'] as string) ?? null),
    });
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [...provideApiTesting(), { provide: AuthService, useValue: { user: signal({ id: '4' }) } }],
    }).compileComponents();
  });

  afterEach(() => localStorage.clear());

  it('saves the applied filters and brings them back', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const views = fixture.debugElement.children[0].componentInstance as SavedViewsComponent;

    host.status = 'draft';
    host.table.apply('acme');
    views.name.set('Acme drafts');
    expect(views.canSave()).toBeTrue();
    views.save();
    expect(views.views().map((view) => view.name)).toEqual(['Acme drafts']);

    host.table.clear();
    expect(host.status).toBeNull();

    views.show(views.views()[0], { hide: () => undefined } as never);
    expect(host.status).toBe('draft');
    expect(host.table.searchDraft()).toBe('acme');
    expect(host.fetch.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ search: 'acme', filters: { status: 'draft' } }));
  });

  it('only saves once something is applied', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const views = fixture.debugElement.children[0].componentInstance as SavedViewsComponent;
    views.name.set('Everything');
    expect(views.canSave()).toBeFalse();
  });
});
