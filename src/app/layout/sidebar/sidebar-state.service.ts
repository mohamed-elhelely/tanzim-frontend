import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'tanzim.sidebarCollapsed';

/**
 * Whether the desktop sidebar is collapsed to icons. Kept in this browser like the theme; the mobile drawer is always
 * full width.
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  private readonly collapsedState = signal(this.readInitial());
  readonly collapsed = this.collapsedState.asReadonly();

  toggle(): void {
    this.set(!this.collapsedState());
  }

  set(collapsed: boolean): void {
    this.collapsedState.set(collapsed);
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // Storage can be blocked; the choice then lasts for this page only.
    }
  }

  private readInitial(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
