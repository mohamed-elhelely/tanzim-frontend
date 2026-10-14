import { Injectable, computed, inject } from '@angular/core';
import { AccessService } from '../../core/auth/access.service';
import { NAV_ITEMS, NavItem } from './nav-items';

/** The menu this user may see, shared by the sidebar and the command palette so both follow the same rules. */
@Injectable({ providedIn: 'root' })
export class VisibleNavService {
  private readonly access = inject(AccessService);
  private readonly role = this.access.role;

  /** By role, staff flag, subscription module and permission; empty groups drop out. */
  readonly items = computed(() =>
    NAV_ITEMS.filter((item) => this.visible(item))
      .map((item) => (item.children ? { ...item, children: item.children.filter((child) => this.visible(child)) } : item))
      .filter((item) => !item.children || item.children.length > 0),
  );

  private visible(item: NavItem): boolean {
    const role = this.role();
    return (
      (!item.roles || (role !== null && item.roles.includes(role))) &&
      (!item.staffOnly || this.access.isStaff()) &&
      (!item.module || this.access.hasModule(item.module)) &&
      (!item.permission || this.access.can(item.permission))
    );
  }
}
