import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/auth/auth.service';
import { AccessService } from '../../core/auth/access.service';
import { NavListComponent } from './nav-list.component';
import { NAV_ITEMS } from './nav-items';

describe('NavListComponent', () => {
  /** Every permission the menu asks for. */
  const ALL = NAV_ITEMS.flatMap((item) => [item, ...(item.children ?? [])]).flatMap((item) => (item.permission ? [item.permission] : []));

  async function render(
    url: string,
    role = 'COMPANY',
    modules: string[] = ['location', 'inventory'],
    access?: object,
    permissions: string[] = ALL,
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

  it('shows platform admins the dashboard, Companies, the Subscriptions group and their notifications', async () => {
    const fixture = await render('/dashboard', 'ADMIN');
    expect(links(fixture)).toEqual(['/dashboard', '/admin/companies', '/notifications']);
    const groups = Array.from(fixture.nativeElement.querySelectorAll('button[aria-expanded]')) as HTMLButtonElement[];
    expect(groups.map((button) => button.textContent?.trim())).toEqual(['nav.platformBilling']);
  });

  it('expands the Subscriptions group on a platform billing page', async () => {
    const fixture = await render('/admin/billing/invoices/3', 'ADMIN');
    expect(links(fixture)).toContain('/admin/billing/subscriptions');
    expect(links(fixture)).toContain('/admin/billing/reports');
  });

  it('hides sections whose subscription module is off', async () => {
    const fixture = await render('/dashboard', 'EMPLOYEE', ['location']);
    expect(links(fixture)).not.toContain('/inventory');
    expect(fixture.nativeElement.textContent).toContain('nav.locations');
    TestBed.resetTestingModule();
    const without = await render('/dashboard', 'EMPLOYEE', []);
    expect(without.nativeElement.textContent).not.toContain('nav.locations');
    // Sales needs no module (it's a collapsed group, so check its label).
    expect(without.nativeElement.textContent).toContain('nav.sales');
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
    const fixture = await render('/company/teams', 'EMPLOYEE', [], undefined, ['access_company', 'view_team']);
    expect(links(fixture).filter((href) => href.startsWith('/company'))).toEqual(['/company/teams']);
    TestBed.resetTestingModule();
    const none = await render('/dashboard', 'EMPLOYEE', [], undefined, []);
    expect(none.nativeElement.textContent).not.toContain('nav.company');
  });

  it("hides a module's group without its access_ permission", async () => {
    const fixture = await render('/dashboard', 'EMPLOYEE', ['location', 'inventory'], undefined, ALL.filter((code) => code !== 'access_sales'));
    expect(fixture.nativeElement.textContent).not.toContain('nav.sales');
    expect(fixture.nativeElement.textContent).toContain('nav.returns');
  });

  it('shows Companies to platform staff only, not to every user without a company', async () => {
    const fixture = await render('/dashboard', 'ADMIN', [], { hasModule: () => false, can: () => false, isStaff: () => false });
    expect(links(fixture)).toEqual(['/dashboard', '/notifications']);
  });
});
