import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { NavListComponent } from './nav-list.component';

describe('NavListComponent', () => {
  async function render(url: string, role = 'COMPANY') {
    TestBed.configureTestingModule({
      imports: [NavListComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideTranslateService(),
        { provide: AuthService, useValue: { role: () => role } },
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    const fixture = TestBed.createComponent(NavListComponent);
    fixture.detectChanges();
    return fixture;
  }

  function links(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('a')).map((a) => (a as HTMLAnchorElement).getAttribute('href') ?? '');
  }

  it('expands the Company group on a company page', async () => {
    const fixture = await render('/company/departments');
    expect(links(fixture)).toContain('/company/departments');
    expect(links(fixture)).toContain('/company/users');
  });

  it('keeps the Company group collapsed elsewhere and toggles it on click', async () => {
    const fixture = await render('/dashboard');
    expect(links(fixture)).not.toContain('/company/users');

    const toggle = fixture.nativeElement.querySelector('button[aria-expanded]') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(links(fixture)).toContain('/company/users');
  });

  it('expands the Locations group on a locations page', async () => {
    const fixture = await render('/locations/cities/3/edit');
    expect(links(fixture)).toContain('/locations/sites');
    expect(links(fixture)).toContain('/locations/districts');
    expect(links(fixture)).not.toContain('/company/users');
  });

  it('shows Companies to platform admins only', async () => {
    expect(links(await render('/dashboard', 'COMPANY'))).not.toContain('/admin/companies');
    TestBed.resetTestingModule();
    expect(links(await render('/dashboard', 'ADMIN'))).toContain('/admin/companies');
  });
});
