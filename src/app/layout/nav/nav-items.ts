export type AppModuleCode = 'inventory' | 'location';

export interface NavItem {
  labelKey: string;
  icon: string;
  routerLink: string;
  module?: AppModuleCode;
}

export const NAV_ITEMS: NavItem[] = [
  { labelKey: 'nav.dashboard', icon: 'pi pi-home', routerLink: '/dashboard' },
  { labelKey: 'nav.company', icon: 'pi pi-building', routerLink: '/company' },
  { labelKey: 'nav.locations', icon: 'pi pi-map-marker', routerLink: '/locations', module: 'location' },
  { labelKey: 'nav.inventory', icon: 'pi pi-box', routerLink: '/inventory', module: 'inventory' },
  { labelKey: 'nav.sales', icon: 'pi pi-shopping-cart', routerLink: '/sales' },
  { labelKey: 'nav.returns', icon: 'pi pi-replay', routerLink: '/returns' },
  { labelKey: 'nav.billing', icon: 'pi pi-credit-card', routerLink: '/billing' },
  { labelKey: 'nav.notifications', icon: 'pi pi-bell', routerLink: '/notifications' },
  { labelKey: 'nav.importExport', icon: 'pi pi-file-import', routerLink: '/import-export' },
];
