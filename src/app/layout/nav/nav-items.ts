import { AuthRole } from '../../core/auth/auth.model';

export type AppModuleCode = 'inventory' | 'location';

export interface NavItem {
  labelKey: string;
  icon: string;
  routerLink: string;
  module?: AppModuleCode;
  /** Only these login roles see the item. Omitted means everyone. */
  roles?: AuthRole[];
  children?: NavItem[];
}

/** Everything that belongs to a company; platform admins have no company. */
const COMPANY_ROLES: AuthRole[] = ['COMPANY', 'EMPLOYEE'];

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: 'pi pi-home', routerLink: '/dashboard' },
  { labelKey: 'nav.companies', icon: 'pi pi-briefcase', routerLink: '/admin/companies', roles: ['ADMIN'] },
  {
    labelKey: 'nav.company',
    icon: 'pi pi-building',
    routerLink: '/company',
    roles: COMPANY_ROLES,
    children: [
      { labelKey: 'nav.companyUsers', icon: 'pi pi-users', routerLink: '/company/users' },
      { labelKey: 'nav.departments', icon: 'pi pi-sitemap', routerLink: '/company/departments' },
      { labelKey: 'nav.teams', icon: 'pi pi-id-card', routerLink: '/company/teams' },
      { labelKey: 'nav.roles', icon: 'pi pi-shield', routerLink: '/company/roles' },
      { labelKey: 'nav.permissionGroups', icon: 'pi pi-th-large', routerLink: '/company/permission-groups' },
      { labelKey: 'nav.permissions', icon: 'pi pi-key', routerLink: '/company/permissions' },
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
      { labelKey: 'nav.categories', icon: 'pi pi-tags', routerLink: '/inventory/categories' },
      { labelKey: 'nav.brands', icon: 'pi pi-star', routerLink: '/inventory/brands' },
    ],
  },
  { labelKey: 'nav.sales', icon: 'pi pi-shopping-cart', routerLink: '/sales', roles: COMPANY_ROLES },
  { labelKey: 'nav.returns', icon: 'pi pi-replay', routerLink: '/returns', roles: COMPANY_ROLES },
  { labelKey: 'nav.billing', icon: 'pi pi-credit-card', routerLink: '/billing', roles: COMPANY_ROLES },
  { labelKey: 'nav.notifications', icon: 'pi pi-bell', routerLink: '/notifications', roles: COMPANY_ROLES },
  { labelKey: 'nav.importExport', icon: 'pi pi-file-import', routerLink: '/import-export', roles: COMPANY_ROLES },
];
