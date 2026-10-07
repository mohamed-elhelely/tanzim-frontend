import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => localStorage.removeItem('tanzim.theme'));

  afterEach(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('tanzim.theme');
  });

  it('toggles the dark class and remembers the choice', () => {
    const service = TestBed.inject(ThemeService);
    service.setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBeTrue();
    expect(localStorage.getItem('tanzim.theme')).toBe('dark');

    service.toggle();
    expect(service.theme()).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBeFalse();
    expect(localStorage.getItem('tanzim.theme')).toBe('light');
  });

  it('starts from the saved theme', () => {
    localStorage.setItem('tanzim.theme', 'dark');
    expect(TestBed.inject(ThemeService).theme()).toBe('dark');
  });
});
