import { AuthRole } from '../../core/auth/auth.model';

export type AppModuleCode = 'inventory' | 'location' | 'accounting';

export interface NavItem {
  labelKey: string;
  icon: string;
  routerLink: string;
  module?: AppModuleCode;
  /** Only these login roles see the item. Omitted means everyone. */
  roles?: AuthRole[];
  /**
   * Only users with this permission codename see the item (see AccessService.can): `access_<module>` on a group,
   * the screen's `view_` codename on a child.
   */
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
    // Subscriptions & platform billing: the super admin's side (/admin/…).
    labelKey: 'nav.platformBilling',
    icon: 'pi pi-credit-card',
    routerLink: '/admin/billing',
    staffOnly: true,
    children: [
      { labelKey: 'nav.subscriptions', icon: 'pi pi-id-card', routerLink: '/admin/billing/subscriptions' },
      { labelKey: 'nav.plans', icon: 'pi pi-tags', routerLink: '/admin/billing/plans' },
      { labelKey: 'nav.billingModules', icon: 'pi pi-th-large', routerLink: '/admin/billing/modules' },
      { labelKey: 'nav.platformInvoices', icon: 'pi pi-receipt', routerLink: '/admin/billing/invoices' },
      { labelKey: 'nav.platformPayments', icon: 'pi pi-wallet', routerLink: '/admin/billing/payments' },
      { labelKey: 'nav.billingReports', icon: 'pi pi-chart-bar', routerLink: '/admin/billing/reports' },
    ],
  },
  {
    labelKey: 'nav.company',
    icon: 'pi pi-building',
    routerLink: '/company',
    permission: 'access_company',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.companyUsers', icon: 'pi pi-users', routerLink: '/company/users', permission: 'view_companyuser' },
      { labelKey: 'nav.departments', icon: 'pi pi-sitemap', routerLink: '/company/departments', permission: 'view_department' },
      { labelKey: 'nav.teams', icon: 'pi pi-id-card', routerLink: '/company/teams', permission: 'view_team' },
      { labelKey: 'nav.roles', icon: 'pi pi-shield', routerLink: '/company/roles', permission: 'view_role' },
      { labelKey: 'nav.permissionGroups', icon: 'pi pi-th-large', routerLink: '/company/permission-groups', permission: 'view_permissiongroup' },
      { labelKey: 'nav.permissions', icon: 'pi pi-key', routerLink: '/company/permissions', permission: 'view_permission' },
      { labelKey: 'nav.companyProfile', icon: 'pi pi-palette', routerLink: '/company/profile', permission: 'view_company' },
    ],
  },
  {
    labelKey: 'nav.locations',
    icon: 'pi pi-map-marker',
    routerLink: '/locations',
    permission: 'access_location',
    module: 'location',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.sites', icon: 'pi pi-building', routerLink: '/locations/sites', permission: 'view_location' },
      { labelKey: 'nav.countries', icon: 'pi pi-globe', routerLink: '/locations/countries', permission: 'view_country' },
      { labelKey: 'nav.regions', icon: 'pi pi-map', routerLink: '/locations/regions', permission: 'view_region' },
      { labelKey: 'nav.cities', icon: 'pi pi-compass', routerLink: '/locations/cities', permission: 'view_city' },
      { labelKey: 'nav.districts', icon: 'pi pi-directions', routerLink: '/locations/districts', permission: 'view_district' },
    ],
  },
  {
    labelKey: 'nav.inventory',
    icon: 'pi pi-box',
    routerLink: '/inventory',
    permission: 'access_inventory',
    module: 'inventory',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.products', icon: 'pi pi-box', routerLink: '/inventory/products', permission: 'view_product' },
      { labelKey: 'nav.variants', icon: 'pi pi-clone', routerLink: '/inventory/variants', permission: 'view_productvariant' },
      { labelKey: 'nav.categories', icon: 'pi pi-tags', routerLink: '/inventory/categories', permission: 'view_category' },
      { labelKey: 'nav.brands', icon: 'pi pi-star', routerLink: '/inventory/brands', permission: 'view_brand' },
      { labelKey: 'nav.warehouses', icon: 'pi pi-warehouse', routerLink: '/inventory/warehouses', permission: 'view_warehouse' },
      { labelKey: 'nav.zones', icon: 'pi pi-objects-column', routerLink: '/inventory/zones', permission: 'view_zone' },
      { labelKey: 'nav.bins', icon: 'pi pi-inbox', routerLink: '/inventory/bins', permission: 'view_bin' },
      { labelKey: 'nav.suppliers', icon: 'pi pi-truck', routerLink: '/inventory/suppliers', permission: 'view_supplier' },
      { labelKey: 'nav.supplierProducts', icon: 'pi pi-list', routerLink: '/inventory/supplier-products', permission: 'view_supplierproduct' },
      { labelKey: 'nav.stockLevels', icon: 'pi pi-chart-bar', routerLink: '/inventory/stock', permission: 'view_stockreservation' },
      { labelKey: 'nav.stockLedger', icon: 'pi pi-history', routerLink: '/inventory/stock-ledger', permission: 'view_stockledger' },
    ],
  },
  {
    labelKey: 'nav.sales',
    icon: 'pi pi-shopping-cart',
    routerLink: '/sales',
    permission: 'access_sales',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.salesOrders', icon: 'pi pi-file', routerLink: '/sales/orders', permission: 'view_salesorder' },
      { labelKey: 'nav.deliveries', icon: 'pi pi-truck', routerLink: '/sales/deliveries', permission: 'view_deliverynote' },
      { labelKey: 'nav.salesInvoices', icon: 'pi pi-receipt', routerLink: '/sales/invoices', permission: 'view_salesinvoice' },
      { labelKey: 'nav.payments', icon: 'pi pi-wallet', routerLink: '/sales/payments', permission: 'view_invoicepayment' },
      { labelKey: 'nav.customers', icon: 'pi pi-users', routerLink: '/sales/customers', permission: 'view_customer' },
    ],
  },
  {
    labelKey: 'nav.returns',
    icon: 'pi pi-replay',
    routerLink: '/returns',
    permission: 'access_returns',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.customerReturns', icon: 'pi pi-user', routerLink: '/returns/customer', permission: 'view_customerreturn' },
      { labelKey: 'nav.supplierReturns', icon: 'pi pi-truck', routerLink: '/returns/supplier', permission: 'view_supplierreturn' },
    ],
  },
  {
    labelKey: 'nav.analytics',
    icon: 'pi pi-chart-line',
    routerLink: '/analytics',
    permission: 'access_reports',
    module: 'inventory',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.dashboards', icon: 'pi pi-th-large', routerLink: '/analytics/dashboards', permission: 'view_dashboard' },
      { labelKey: 'nav.reports', icon: 'pi pi-chart-bar', routerLink: '/analytics/reports', permission: 'view_report' },
    ],
  },
  {
    labelKey: 'nav.accounting',
    icon: 'pi pi-calculator',
    routerLink: '/accounting',
    permission: 'access_accounting',
    module: 'accounting',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.journalEntries', icon: 'pi pi-book', routerLink: '/accounting/journal-entries', permission: 'view_journalentry' },
      { labelKey: 'nav.accounts', icon: 'pi pi-sitemap', routerLink: '/accounting/accounts', permission: 'view_account' },
      { labelKey: 'nav.fiscalYears', icon: 'pi pi-calendar', routerLink: '/accounting/fiscal-years', permission: 'view_fiscalyear' },
      { labelKey: 'nav.accountingReports', icon: 'pi pi-chart-bar', routerLink: '/accounting/reports', permission: 'view_accountingreport' },
      { labelKey: 'nav.supplierPayments', icon: 'pi pi-wallet', routerLink: '/accounting/supplier-payments', permission: 'view_supplierpayment' },
      { labelKey: 'nav.debitNotes', icon: 'pi pi-minus-circle', routerLink: '/accounting/debit-notes', permission: 'view_debitnote' },
    ],
  },
  // The company's subscription and platform invoices: for company admins.
  { labelKey: 'nav.billing', icon: 'pi pi-credit-card', routerLink: '/billing', roles: ['COMPANY'] },
  { labelKey: 'nav.notifications', icon: 'pi pi-bell', routerLink: '/notifications' },
  { labelKey: 'nav.importExport', icon: 'pi pi-file-import', routerLink: '/import-export', roles: COMPANY_ROLES },
];
