import { AuthRole } from '../../core/auth/auth.model';

export type AppModuleCode = 'inventory' | 'location' | 'accounting';

export interface NavItem {
  labelKey: string;
  icon: string;
  routerLink: string;
  module?: AppModuleCode;
  /** Only these login roles see the item. Omitted means everyone. */
  roles?: AuthRole[];
  /** Only users with this permission codename see the item (see AccessService.can). */
  permission?: string;
  /** Only platform staff see the item. */
  staffOnly?: boolean;
  children?: NavItem[];
}

/** Everything that belongs to a company; platform admins have no company. */
const COMPANY_ROLES: AuthRole[] = ['COMPANY', 'EMPLOYEE'];

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: 'pi pi-home', routerLink: '/dashboard' },
  { labelKey: 'nav.companies', icon: 'pi pi-briefcase', routerLink: '/admin/companies', staffOnly: true },
  {
    labelKey: 'nav.company',
    icon: 'pi pi-building',
    routerLink: '/company',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.companyUsers', icon: 'pi pi-users', routerLink: '/company/users', permission: 'view_companyuser' },
      { labelKey: 'nav.departments', icon: 'pi pi-sitemap', routerLink: '/company/departments', permission: 'view_department' },
      { labelKey: 'nav.teams', icon: 'pi pi-id-card', routerLink: '/company/teams', permission: 'view_team' },
      { labelKey: 'nav.roles', icon: 'pi pi-shield', routerLink: '/company/roles', permission: 'view_role' },
      { labelKey: 'nav.permissionGroups', icon: 'pi pi-th-large', routerLink: '/company/permission-groups', permission: 'view_permissiongroup' },
      { labelKey: 'nav.permissions', icon: 'pi pi-key', routerLink: '/company/permissions', permission: 'view_permission' },
    ],
  },
  {
    labelKey: 'nav.locations',
    icon: 'pi pi-map-marker',
    routerLink: '/locations',
    module: 'location',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.sites', icon: 'pi pi-building', routerLink: '/locations/sites' },
      { labelKey: 'nav.countries', icon: 'pi pi-globe', routerLink: '/locations/countries' },
      { labelKey: 'nav.regions', icon: 'pi pi-map', routerLink: '/locations/regions' },
      { labelKey: 'nav.cities', icon: 'pi pi-compass', routerLink: '/locations/cities' },
      { labelKey: 'nav.districts', icon: 'pi pi-directions', routerLink: '/locations/districts' },
    ],
  },
  {
    labelKey: 'nav.inventory',
    icon: 'pi pi-box',
    routerLink: '/inventory',
    module: 'inventory',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.products', icon: 'pi pi-box', routerLink: '/inventory/products' },
      { labelKey: 'nav.variants', icon: 'pi pi-clone', routerLink: '/inventory/variants' },
      { labelKey: 'nav.categories', icon: 'pi pi-tags', routerLink: '/inventory/categories' },
      { labelKey: 'nav.brands', icon: 'pi pi-star', routerLink: '/inventory/brands' },
      { labelKey: 'nav.warehouses', icon: 'pi pi-warehouse', routerLink: '/inventory/warehouses' },
      { labelKey: 'nav.zones', icon: 'pi pi-objects-column', routerLink: '/inventory/zones' },
      { labelKey: 'nav.bins', icon: 'pi pi-inbox', routerLink: '/inventory/bins' },
      { labelKey: 'nav.suppliers', icon: 'pi pi-truck', routerLink: '/inventory/suppliers' },
      { labelKey: 'nav.supplierProducts', icon: 'pi pi-list', routerLink: '/inventory/supplier-products' },
      { labelKey: 'nav.stockLevels', icon: 'pi pi-chart-bar', routerLink: '/inventory/stock' },
      { labelKey: 'nav.stockLedger', icon: 'pi pi-history', routerLink: '/inventory/stock-ledger' },
      { labelKey: 'nav.transfers', icon: 'pi pi-arrow-right-arrow-left', routerLink: '/inventory/transfers' },
      { labelKey: 'nav.adjustments', icon: 'pi pi-sliders-h', routerLink: '/inventory/adjustments' },
    ],
  },
  {
    labelKey: 'nav.sales',
    icon: 'pi pi-shopping-cart',
    routerLink: '/sales',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.salesOrders', icon: 'pi pi-file', routerLink: '/sales/orders' },
      { labelKey: 'nav.deliveries', icon: 'pi pi-truck', routerLink: '/sales/deliveries' },
      { labelKey: 'nav.salesInvoices', icon: 'pi pi-receipt', routerLink: '/sales/invoices' },
      { labelKey: 'nav.payments', icon: 'pi pi-wallet', routerLink: '/sales/payments' },
      { labelKey: 'nav.customers', icon: 'pi pi-users', routerLink: '/sales/customers' },
    ],
  },
  {
    labelKey: 'nav.returns',
    icon: 'pi pi-replay',
    routerLink: '/returns',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.customerReturns', icon: 'pi pi-user', routerLink: '/returns/customer' },
      { labelKey: 'nav.supplierReturns', icon: 'pi pi-truck', routerLink: '/returns/supplier' },
    ],
  },
  {
    labelKey: 'nav.accounting',
    icon: 'pi pi-calculator',
    routerLink: '/accounting',
    module: 'accounting',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.journalEntries', icon: 'pi pi-book', routerLink: '/accounting/journal-entries' },
      { labelKey: 'nav.accounts', icon: 'pi pi-sitemap', routerLink: '/accounting/accounts' },
      { labelKey: 'nav.fiscalYears', icon: 'pi pi-calendar', routerLink: '/accounting/fiscal-years' },
      { labelKey: 'nav.accountingReports', icon: 'pi pi-chart-bar', routerLink: '/accounting/reports' },
      { labelKey: 'nav.supplierPayments', icon: 'pi pi-wallet', routerLink: '/accounting/supplier-payments' },
      { labelKey: 'nav.debitNotes', icon: 'pi pi-minus-circle', routerLink: '/accounting/debit-notes' },
    ],
  },
  // The company's subscription and platform invoices: for company admins.
  { labelKey: 'nav.billing', icon: 'pi pi-credit-card', routerLink: '/billing', roles: ['COMPANY'] },
  { labelKey: 'nav.notifications', icon: 'pi pi-bell', routerLink: '/notifications' },
  { labelKey: 'nav.importExport', icon: 'pi pi-file-import', routerLink: '/import-export', roles: COMPANY_ROLES },
];
