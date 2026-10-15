import { Injectable, inject, signal } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
import { filter } from 'rxjs';
import { NAV_ITEMS, NavItem } from '../../layout/nav/nav-items';

/**
 * Module list screens whose activity the system log can show, and the audit `resource` values that belong to each
 * (the permission-catalog names the log records; `GET audit/v1/logs/?resource=a,b` takes several at once).
 * A document's lines are logged as their own resource, so they are listed next to it.
 *
 * Screens left out on purpose: the system log itself, Permissions (a global catalog, not company data), stock
 * levels, the stock ledger, analytics and accounting reports (computed views or an append-only ledger, not edited
 * records) and the platform billing screens (not company data).
 */
export const MODULE_ACTIVITY_RESOURCES: Readonly<Record<string, readonly string[]>> = {
  '/company/users': ['companyuser', 'user'],
  '/company/departments': ['department'],
  '/company/teams': ['team'],
  '/company/roles': ['role'],
  '/company/permission-groups': ['permissiongroup'],
  '/company/profile': ['company'],
  '/locations/sites': ['location'],
  '/locations/countries': ['country'],
  '/locations/regions': ['region'],
  '/locations/cities': ['city'],
  '/locations/districts': ['district'],
  '/inventory/products': ['product'],
  '/inventory/variants': ['productvariant'],
  '/inventory/categories': ['category'],
  '/inventory/brands': ['brand'],
  '/inventory/warehouses': ['warehouse'],
  '/inventory/zones': ['zone'],
  '/inventory/bins': ['bin'],
  '/inventory/suppliers': ['supplier'],
  '/inventory/supplier-products': ['supplierproduct'],
  '/sales/orders': ['salesorder', 'salesorderline'],
  '/sales/deliveries': ['deliverynote', 'deliverynoteline'],
  '/sales/invoices': ['salesinvoice'],
  '/sales/payments': ['invoicepayment'],
  '/sales/customers': ['customer'],
  '/returns/customer': ['customerreturn'],
  '/returns/supplier': ['supplierreturn'],
  '/accounting/journal-entries': ['journalentry', 'journalline'],
  '/accounting/accounts': ['account'],
  '/accounting/fiscal-years': ['fiscalyear'],
  '/accounting/supplier-payments': ['supplierpayment'],
  '/accounting/debit-notes': ['debitnote'],
};

/**
 * What the activity drawer shows: the module's name (a translation key) and its audit resources; with `objectId`,
 * only the log of that one record (a row's "View logs").
 */
export interface ModuleActivity {
  titleKey: string;
  resources: readonly string[];
  objectId?: string | number;
  /** The record's name for the title (e.g. the brand's name, the order's number). */
  objectName?: string;
}

/** The module activity for a screen's path (`/sales/orders`), or null when the screen has none. */
export function moduleActivityFor(path: string): ModuleActivity | null {
  const resources = MODULE_ACTIVITY_RESOURCES[path];
  if (!resources) {
    return null;
  }
  return { titleKey: navLabel(NAV_ITEMS, path) ?? 'systemLogs.title', resources };
}

function navLabel(items: NavItem[], path: string): string | undefined {
  for (const item of items) {
    if (item.routerLink === path) {
      return item.labelKey;
    }
    const child = navLabel(item.children ?? [], path);
    if (child) {
      return child;
    }
  }
  return undefined;
}

/**
 * Opens the module activity drawer (hosted once by the shell) from any page header. Leaving the page closes it,
 * so it never shows one module's activity over another module's screen.
 */
@Injectable({ providedIn: 'root' })
export class ModuleActivityService {
  private readonly state = signal<ModuleActivity | null>(null);
  readonly current = this.state.asReadonly();

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => this.close());
  }

  open(activity: ModuleActivity): void {
    this.state.set(activity);
  }

  close(): void {
    this.state.set(null);
  }
}
