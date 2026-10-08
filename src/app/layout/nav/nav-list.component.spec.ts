import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { AccessService } from '../../core/auth/access.service';
import { NavListComponent } from './nav-list.component';

describe('NavListComponent', () => {
  const ALL_COMPANY = ['view_companyuser', 'view_department', 'view_team', 'view_role', 'view_permissiongroup', 'view_permission'];

  async function render(
    url: string,
    role = 'COMPANY',
    modules: string[] = ['location', 'inventory'],
    access?: object,
    permissions: string[] = ALL_COMPANY,
  ) {
    TestBed.configureTestingModule({
      imports: [NavListComponent],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        provideTranslateService(),
        { provide: AuthService, useValue: { role: () => role } },
        {
          provide: AccessService,
          useValue: access ?? {
            hasModule: (code: string) => modules.includes(code),
            can: (codename: string) => permissions.includes(codename),
            isStaff: () => role === 'ADMIN',
          },
        },
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

  it('shows platform admins only the dashboard, Companies and their notifications', async () => {
    const fixture = await render('/dashboard', 'ADMIN');
    expect(links(fixture)).toEqual(['/dashboard', '/admin/companies', '/notifications']);
    expect(fixture.nativeElement.querySelector('button[aria-expanded]')).toBeNull();
  });

  it('hides sections whose subscription module is off', async () => {
    const fixture = await render('/dashboard', 'EMPLOYEE', ['location']);
    expect(links(fixture)).not.toContain('/inventory');
    expect(fixture.nativeElement.textContent).toContain('nav.locations');
    TestBed.resetTestingModule();
    const without = await render('/dashboard', 'EMPLOYEE', []);
    expect(without.nativeElement.textContent).not.toContain('nav.locations');
    expect(links(without)).toContain('/sales');
  });

  it('expands a module group opened by URL once the subscription loads', async () => {
    const loaded = signal(false);
    const fixture = await render('/inventory/products', 'COMPANY', [], { hasModule: () => loaded(), can: () => true, isStaff: () => false });
    expect(links(fixture)).not.toContain('/inventory/products');
    loaded.set(true);
    fixture.detectChanges();
    expect(links(fixture)).toContain('/inventory/products');
  });

  it('shows only the company screens the user may view, and drops an empty group', async () => {
    const fixture = await render('/company/teams', 'EMPLOYEE', [], undefined, ['view_team']);
    expect(links(fixture).filter((href) => href.startsWith('/company'))).toEqual(['/company/teams']);
    TestBed.resetTestingModule();
    const none = await render('/dashboard', 'EMPLOYEE', [], undefined, []);
    expect(none.nativeElement.textContent).not.toContain('nav.company');
  });

  it('shows Companies to platform staff only, not to every user without a company', async () => {
    const fixture = await render('/dashboard', 'ADMIN', [], { hasModule: () => false, can: () => false, isStaff: () => false });
    expect(links(fixture)).toEqual(['/dashboard', '/notifications']);
  });
});
