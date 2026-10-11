import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { provideApiTesting } from '../../testing/api-testing';
import { NavItem } from '../nav/nav-items';
import { VisibleNavService } from '../nav/visible-nav.service';
import { CommandPaletteComponent, normalizeSearch } from './command-palette.component';

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
