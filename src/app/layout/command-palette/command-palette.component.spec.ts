import { signal } from '@angular/core';
import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { envelope, errorEnvelope, provideApiTesting } from '../../testing/api-testing';
import { NavItem } from '../nav/nav-items';
import { VisibleNavService } from '../nav/visible-nav.service';
import { CommandPaletteComponent, SEARCH_DEBOUNCE_MS, normalizeSearch } from './command-palette.component';

const SEARCH = '/api/common/v1/search/';

const ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: 'pi pi-home', routerLink: '/dashboard' },
  {
    labelKey: 'nav.sales',
    icon: 'pi pi-shopping-cart',
    routerLink: '/sales',
    children: [
      { labelKey: 'nav.salesOrders', icon: 'pi pi-file', routerLink: '/sales/orders' },
      { labelKey: 'nav.salesInvoices', icon: 'pi pi-receipt', routerLink: '/sales/invoices' },
    ],
  },
  {
    labelKey: 'nav.company',
    icon: 'pi pi-building',
    routerLink: '/company',
    children: [{ labelKey: 'nav.departments', icon: 'pi pi-sitemap', routerLink: '/company/departments' }],
  },
];

describe('CommandPaletteComponent', () => {
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
      providers: [...provideApiTesting(), { provide: VisibleNavService, useValue: { items: signal(ITEMS) } }],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', {
      nav: {
        dashboard: 'Dashboard',
        sales: 'Sales',
        salesOrders: 'Sales orders',
        salesInvoices: 'Invoices',
        company: 'Company',
        departments: 'الإدارات',
      },
    });
    TestBed.inject(TranslateService).use('en');
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });

  function create() {
    const fixture = TestBed.createComponent(CommandPaletteComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('opens with Ctrl+K and ⌘K', () => {
    const palette = create();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
    expect(palette.open()).toBeTrue();
    palette.open.set(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', metaKey: true }));
    expect(palette.open()).toBeTrue();
  });

  it('lists every screen, flattened, with its group', () => {
    const palette = create();
    expect(palette.entries().map((entry) => entry.routerLink)).toEqual([
      '/dashboard',
      '/sales/orders',
      '/sales/invoices',
      '/company/departments',
    ]);
    expect(palette.entries()[1].groupKey).toBe('nav.sales');
  });

  it('matches every word against the label and the group, labels starting with the query first', () => {
    const palette = create();
    palette.setQuery('inv');
    expect(palette.results().map((entry) => entry.routerLink)).toEqual(['/sales/invoices']);
    palette.setQuery('sales');
    expect(palette.results()[0].routerLink).toBe('/sales/orders');
    expect(palette.results().length).toBe(2);
    palette.setQuery('ادارات');
    expect(palette.results().map((entry) => entry.routerLink)).toEqual(['/company/departments']);
    palette.setQuery('nothing here');
    expect(palette.results()).toEqual([]);
  });

  it('moves with the arrow keys and opens the highlighted screen with Enter', () => {
    const palette = create();
    palette.show();
    palette.setQuery('s');
    palette.onKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    expect(palette.active()).toBe(1);
    palette.onKey(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    palette.onKey(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    expect(palette.active()).toBe(palette.results().length - 1);
    palette.onKey(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(navigate).toHaveBeenCalledWith(palette.results()[palette.active()].routerLink);
    expect(palette.open()).toBeFalse();
  });
});

describe('normalizeSearch', () => {
  it('folds case, Arabic diacritics and letter variants', () => {
    expect(normalizeSearch('  Sales ')).toBe('sales');
    expect(normalizeSearch('إِدَارَة')).toBe('اداره');
    expect(normalizeSearch('مستشفى')).toBe('مستشفي');
  });
});

describe('CommandPaletteComponent record search', () => {
  let navigate: jasmine.Spy;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandPaletteComponent],
      providers: [...provideApiTesting(), { provide: VisibleNavService, useValue: { items: signal(ITEMS) } }],
    }).compileComponents();
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function openPalette() {
    const fixture = TestBed.createComponent(CommandPaletteComponent);
    fixture.detectChanges();
    fixture.componentInstance.show();
    fixture.detectChanges();
    return fixture;
  }

  function type(fixture: ReturnType<typeof openPalette>, text: string) {
    fixture.componentInstance.setQuery(text);
    fixture.detectChanges();
  }

  it('waits for a pause in typing, searches only the types the user can open, and groups the hits', fakeAsync(() => {
    const fixture = openPalette();
    const palette = fixture.componentInstance;
    type(fixture, 'a');
    tick(SEARCH_DEBOUNCE_MS);
    httpMock.expectNone(SEARCH); // one character is not searched

    type(fixture, 'ac');
    tick(SEARCH_DEBOUNCE_MS - 50);
    type(fixture, 'acm');
    tick(SEARCH_DEBOUNCE_MS);
    fixture.detectChanges();
    expect(palette.searching()).toBeTrue();
    const req = httpMock.expectOne((r) => r.url === SEARCH);
    expect(req.request.params.get('q')).toBe('acm');
    // Only sales orders and invoices are in this user's menu.
    expect(req.request.params.get('types')).toBe('salesorder,salesinvoice');
    req.flush(
      envelope([
        { type: 'salesinvoice', id: 9, label: 'INV-9', sublabel: 'Acme' },
        { type: 'salesorder', id: 4, label: 'SO-4', sublabel: 'Acme' },
      ]),
    );
    fixture.detectChanges();

    expect(palette.searching()).toBeFalse();
    expect(palette.recordGroups().map((group) => group.type)).toEqual(['salesorder', 'salesinvoice']);
    const text = fixture.nativeElement.ownerDocument.body.textContent;
    expect(text).toContain('palette.types.salesorder');
    expect(text).toContain('SO-4');
  }));

  it('drops the answer to an older query', fakeAsync(() => {
    const fixture = openPalette();
    const palette = fixture.componentInstance;
    type(fixture, 'acme');
    tick(SEARCH_DEBOUNCE_MS);
    const old = httpMock.expectOne((r) => r.url === SEARCH && r.params.get('q') === 'acme');
    type(fixture, 'beta');
    tick(SEARCH_DEBOUNCE_MS);
    expect(old.cancelled).toBeTrue();
    httpMock
      .expectOne((r) => r.url === SEARCH && r.params.get('q') === 'beta')
      .flush(envelope([{ type: 'salesorder', id: 5, label: 'SO-5', sublabel: '' }]));
    expect(palette.recordGroups()[0].hits.map((hit) => hit.id)).toEqual([5]);
  }));

  it('moves from the screens into the records with the arrow keys and opens the record on Enter', fakeAsync(() => {
    const fixture = openPalette();
    const palette = fixture.componentInstance;
    type(fixture, 'sales');
    tick(SEARCH_DEBOUNCE_MS);
    httpMock.expectOne((r) => r.url === SEARCH).flush(envelope([{ type: 'salesinvoice', id: 9, label: 'INV-9', sublabel: '' }]));
    fixture.detectChanges();
    const screens = palette.results().length;
    expect(palette.items().length).toBe(screens + 1);

    for (let i = 0; i < screens; i++) {
      palette.onKey(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    }
    expect(palette.active()).toBe(screens);
    palette.onKey(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(navigate).toHaveBeenCalledWith('/sales/invoices/9');
    expect(palette.open()).toBeFalse();
  }));

  it('still lists the screens when the search fails', fakeAsync(() => {
    const fixture = openPalette();
    const palette = fixture.componentInstance;
    type(fixture, 'sales');
    tick(SEARCH_DEBOUNCE_MS);
    httpMock.expectOne((r) => r.url === SEARCH).flush(errorEnvelope(400, 'Bad'), { status: 400, statusText: 'Bad Request' });
    fixture.detectChanges();
    expect(palette.searching()).toBeFalse();
    expect(palette.recordGroups()).toEqual([]);
    expect(palette.results().length).toBeGreaterThan(0);
  }));
});
