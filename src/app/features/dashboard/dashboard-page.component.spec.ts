import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccessService } from '../../core/auth/access.service';
import { AuthService } from '../../core/auth/auth.service';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { DashboardPageComponent } from './dashboard-page.component';

const API = '/api/';

describe('DashboardPageComponent setup steps', () => {
  let httpMock: HttpTestingController;
  let modules: string[];
  let logo: string | null;

  beforeEach(async () => {
    modules = ['inventory', 'location'];
    logo = null;
    await TestBed.configureTestingModule({
      imports: [DashboardPageComponent],
      providers: [
        ...provideApiTesting(),
        {
          provide: AccessService,
          useValue: {
            isStaff: signal(false),
            settled: signal(true),
            current: () => ({ company: { id: 1, name: 'Acme', logo, primary_color: '#000000', secondary_color: '#000000' } }),
            can: () => true,
            hasModule: (code: string) => modules.includes(code),
          },
        },
        { provide: AuthService, useValue: { role: () => 'COMPANY', user: () => ({ name: 'Sara' }) } },
      ],
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  /** Answers every count request: `total` per path, 0 for the rest. */
  function answerCounts(totals: Record<string, number>) {
    for (const req of httpMock.match((r) => r.url.startsWith(API))) {
      const path = req.request.url.slice(API.length);
      const total = totals[path] ?? 0;
      req.flush(path === 'company/v1/company-user/' ? envelope(Array(total).fill({})) : envelope([], total));
    }
  }

  it('walks a new company through branding, people, stock and customers', () => {
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    answerCounts({ 'company/v1/departments/': 2, 'inventory/v1/warehouse/': 1 });
    fixture.detectChanges();

    const steps = fixture.componentInstance.steps();
    expect(steps.map((step) => step.key)).toEqual([
      'branding',
      'locations',
      'departments',
      'teams',
      'users',
      'warehouses',
      'products',
      'customers',
    ]);
    expect(steps.filter((step) => step.done).map((step) => step.key)).toEqual(['departments', 'warehouses']);
    expect(fixture.nativeElement.textContent).toContain('dashboard.steps.products');
  });

  it('counts branding as done once the company has a logo, and hides stock steps without inventory', () => {
    logo = 'https://cdn.test/logo.png';
    modules = [];
    const fixture = TestBed.createComponent(DashboardPageComponent);
    fixture.detectChanges();
    answerCounts({});

    const steps = fixture.componentInstance.steps();
    expect(steps.find((step) => step.key === 'branding')?.done).toBeTrue();
    expect(steps.some((step) => step.key === 'warehouses' || step.key === 'products' || step.key === 'locations')).toBeFalse();
  });
});
