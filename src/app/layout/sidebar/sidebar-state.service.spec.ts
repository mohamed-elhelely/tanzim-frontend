import { TestBed } from '@angular/core/testing';
import { SidebarStateService } from './sidebar-state.service';

describe('SidebarStateService', () => {
  afterEach(() => localStorage.removeItem('tanzim.sidebarCollapsed'));

  it('starts expanded, toggles, and remembers the choice in this browser', () => {
    localStorage.removeItem('tanzim.sidebarCollapsed');
    const state = TestBed.inject(SidebarStateService);
    expect(state.collapsed()).toBeFalse();
    state.toggle();
    expect(state.collapsed()).toBeTrue();
    expect(localStorage.getItem('tanzim.sidebarCollapsed')).toBe('1');

    TestBed.resetTestingModule();
    expect(TestBed.inject(SidebarStateService).collapsed()).toBeTrue();
  });
});
