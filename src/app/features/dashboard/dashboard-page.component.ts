import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AccessService } from '../../core/auth/access.service';
import { TenantCompanyService } from '../admin/companies/tenant-company.service';
import { DepartmentService } from '../company/departments/department.service';
import { TeamService } from '../company/teams/team.service';
import { CompanyUserService } from '../company/users/company-user.service';
import { LocationService } from '../locations/sites/location.service';

type StatKey = 'users' | 'departments' | 'teams' | 'locations' | 'companies' | 'activeCompanies';

/** Shown only when the user has this permission or the company has this module. */
interface Gate {
  permission?: string;
  module?: string;
}

interface StatCard extends Gate {
  key: StatKey;
  icon: string;
  link: string;
  /** Tailwind classes for the icon tile. */
  tone: string;
}

interface QuickAction extends Gate {
  labelKey: string;
  icon: string;
  link: string;
}

const STATS: StatCard[] = [
  {
    key: 'users',
    icon: 'pi-users',
    link: '/company/users',
    permission: 'view_companyuser',
    tone: 'bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
  },
  {
    key: 'departments',
    icon: 'pi-sitemap',
    link: '/company/departments',
    permission: 'view_department',
    tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  {
    key: 'teams',
    icon: 'pi-id-card',
    link: '/company/teams',
    permission: 'view_team',
    tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  },
  {
    key: 'locations',
    icon: 'pi-map-marker',
    link: '/locations/sites',
    module: 'location',
    permission: 'view_location',
    tone: 'bg-sky-100 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  },
];

/** What a platform admin (no company) sees instead of the company stats. */
const PLATFORM_STATS: StatCard[] = [
  {
    key: 'companies',
    icon: 'pi-briefcase',
    link: '/admin/companies',
    tone: 'bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
  },
  {
    key: 'activeCompanies',
    icon: 'pi-check-circle',
    link: '/admin/companies',
    tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
];

const PLATFORM_ACTIONS: QuickAction[] = [
  { labelKey: 'dashboard.actions.newCompany', icon: 'pi-plus', link: '/admin/companies/new' },
];

const QUICK_ACTIONS: QuickAction[] = [
  { labelKey: 'dashboard.actions.newUser', icon: 'pi-user-plus', link: '/company/users/new', permission: 'add_companyuser' },
  { labelKey: 'dashboard.actions.newDepartment', icon: 'pi-sitemap', link: '/company/departments/new', permission: 'add_department' },
  { labelKey: 'dashboard.actions.newTeam', icon: 'pi-id-card', link: '/company/teams/new', permission: 'add_team' },
  { labelKey: 'dashboard.actions.newLocation', icon: 'pi-map-marker', link: '/locations/sites/new', module: 'location', permission: 'add_location' },
];

/** Setup steps in the order a new company usually does them; each is done once its count is > 0. */
const SETUP_STEPS: Array<Gate & { key: StatKey; labelKey: string; link: string }> = [
  { key: 'locations', labelKey: 'dashboard.steps.locations', link: '/locations/sites/new', module: 'location', permission: 'add_location' },
  { key: 'departments', labelKey: 'dashboard.steps.departments', link: '/company/departments/new', permission: 'add_department' },
  { key: 'teams', labelKey: 'dashboard.steps.teams', link: '/company/teams/new', permission: 'add_team' },
  { key: 'users', labelKey: 'dashboard.steps.users', link: '/company/users/new', permission: 'add_companyuser' },
];

@Component({
  selector: 'app-dashboard-page',
  imports: [TranslatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent {
  private readonly users = inject(CompanyUserService);
  private readonly departments = inject(DepartmentService);
  private readonly teams = inject(TeamService);
  private readonly locations = inject(LocationService);
  private readonly companies = inject(TenantCompanyService);
  private readonly access = inject(AccessService);
  private readonly auth = inject(AuthService);
  /** Users without a company: platform staff see company counts, anyone else only the welcome. */
  private readonly hasCompany = this.auth.role() !== 'ADMIN';

  readonly userName = this.auth.user()?.name ?? '';
  readonly isPlatformAdmin = this.access.isStaff;
  readonly stats = computed(() =>
    this.isPlatformAdmin() ? PLATFORM_STATS : this.hasCompany ? STATS.filter((stat) => this.allowed(stat)) : [],
  );
  readonly quickActions = computed(() =>
    this.isPlatformAdmin() ? PLATFORM_ACTIONS : this.hasCompany ? QUICK_ACTIONS.filter((action) => this.allowed(action)) : [],
  );
  /** undefined = loading, null = unavailable, number = count. */
  readonly counts = signal<Partial<Record<StatKey, number | null>>>({});
  /** The setup checklist only lists steps this user can do. */
  readonly steps = computed(() =>
    this.isPlatformAdmin() || !this.hasCompany
      ? []
      : SETUP_STEPS.filter((step) => this.allowed(step)).map((step) => ({
          ...step,
          done: (this.counts()[step.key] ?? 0) > 0,
        })),
  );
  readonly stepsDone = computed(() => this.steps().filter((step) => step.done).length);

  constructor() {
    // Counts are requested only for the cards this user may see, so wait until /me has answered.
    let requested = false;
    effect(() => {
      if (this.access.settled() && !requested) {
        requested = true;
        untracked(() => this.loadCounts());
      }
    });
  }

  private loadCounts(): void {
    if (this.isPlatformAdmin()) {
      this.companies.all().pipe(catchError(() => of(null))).subscribe((companies) => {
        this.counts.set({
          companies: companies?.length ?? null,
          activeCompanies: companies ? companies.filter((company) => company.is_active).length : null,
        });
      });
      return;
    }
    const shown = new Set(this.stats().map((stat) => stat.key));
    if (shown.has('users')) {
      this.load('users', this.users.all().pipe(map((items) => items.length)));
    }
    if (shown.has('departments')) {
      this.load('departments', this.total(this.departments.list({ page: 1, pageSize: 1 })));
    }
    if (shown.has('teams')) {
      this.load('teams', this.total(this.teams.list({ page: 1, pageSize: 1 })));
    }
    if (shown.has('locations')) {
      this.load('locations', this.total(this.locations.list({ page: 1, pageSize: 1 })));
    }
  }

  private allowed(gate: Gate): boolean {
    return (!gate.permission || this.access.can(gate.permission)) && (!gate.module || this.access.hasModule(gate.module));
  }

  private total(request: Observable<{ total: number }>): Observable<number> {
    return request.pipe(map((page) => page.total));
  }

  private load(key: StatKey, request: Observable<number>): void {
    request.pipe(catchError(() => of(null))).subscribe((count) => {
      this.counts.update((counts) => ({ ...counts, [key]: count }));
    });
  }
}
