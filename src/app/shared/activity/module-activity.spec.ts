import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MODULE_ACTIVITY_RESOURCES, ModuleActivityService, moduleActivityFor } from './module-activity';

describe('module activity', () => {
  it("names a module list screen's audit resources and its menu label", () => {
    expect(moduleActivityFor('/sales/orders')).toEqual({ titleKey: 'nav.salesOrders', resources: ['salesorder', 'salesorderline'] });
    expect(moduleActivityFor('/company/users')?.resources).toEqual(['companyuser', 'user']);
  });

  it('has none for detail and form screens, or screens that are not edited records', () => {
    expect(moduleActivityFor('/sales/orders/5')).toBeNull();
    expect(moduleActivityFor('/sales/orders/new')).toBeNull();
    expect(moduleActivityFor('/inventory/stock-ledger')).toBeNull();
    expect(moduleActivityFor('/company/system-logs')).toBeNull();
  });

  it('gives every module screen a menu label', () => {
    for (const path of Object.keys(MODULE_ACTIVITY_RESOURCES)) {
      expect(moduleActivityFor(path)?.titleKey).withContext(path).toMatch(/^nav\./);
    }
  });

  it('closes the drawer when the user leaves the page', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: '**', children: [] }])] });
    const drawer = TestBed.inject(ModuleActivityService);
    drawer.open(moduleActivityFor('/sales/orders')!);
    expect(drawer.current()?.titleKey).toBe('nav.salesOrders');
    await TestBed.inject(Router).navigateByUrl('/sales/invoices');
    expect(drawer.current()).toBeNull();
  });
});
