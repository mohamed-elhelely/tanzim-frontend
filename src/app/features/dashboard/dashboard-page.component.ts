import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { SubscriptionService } from '../../core/subscription/subscription.service';
import { TenantCompanyService } from '../admin/companies/tenant-company.service';
import { DepartmentService } from '../company/departments/department.service';
import { TeamService } from '../company/teams/team.service';
import { CompanyUserService } from '../company/users/company-user.service';
import { LocationService } from '../locations/sites/location.service';

type StatKey = 'users' | 'departments' | 'teams' | 'locations' | 'companies' | 'activeCompanies';

/** Stats that need the `location` subscription module. */
const LOCATION_KEYS: ReadonlySet<string> = new Set(['locations']);

interface StatCard {
  key: StatKey;
  icon: string;
  link: string;
  /** Tailwind classes for the icon tile. */
  tone: string;
}

interface QuickAction {
  labelKey: string;
  icon: string;
  link: string;
}

const STATS: StatCard[] = [
  {
    key: 'users',
    icon: 'pi-users',
    link: '/company/users',
    tone: 'bg-primary-100 text-primary-600 dark:bg-primary-500/15 dark:text-primary-300',
  },
  {
    key: 'departments',
    icon: 'pi-sitemap',
    link: '/company/departments',
    tone: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  {
    key: 'teams',
    icon: 'pi-id-card',
    link: '/company/teams',
    tone: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  },
  {
    key: 'locations',
    icon: 'pi-map-marker',
    link: '/locations/sites',
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
  { labelKey: 'dashboard.actions.newUser', icon: 'pi-user-plus', link: '/company/users/new' },
  { labelKey: 'dashboard.actions.newDepartment', icon: 'pi-sitemap', link: '/company/departments/new' },
  { labelKey: 'dashboard.actions.newTeam', icon: 'pi-id-card', link: '/company/teams/new' },
  { labelKey: 'dashboard.actions.newLocation', icon: 'pi-map-marker', link: '/locations/sites/new' },
];

/** Setup steps in the order a new company usually does them; each is done once its count is > 0. */
const SETUP_STEPS: Array<{ key: StatKey; labelKey: string; link: string }> = [
  { key: 'locations', labelKey: 'dashboard.steps.locations', link: '/locations/sites/new' },
  { key: 'departments', labelKey: 'dashboard.steps.departments', link: '/company/departments/new' },
  { key: 'teams', labelKey: 'dashboard.steps.teams', link: '/company/teams/new' },
  { key: 'users', labelKey: 'dashboard.steps.users', link: '/company/users/new' },
];

@Component({
  selector: 'app-dashboard-page',
  imports: [TranslatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.component.html',
})
export class DashboardPageComponent implements OnInit {
  private readonly users = inject(CompanyUserService);
  private readonly departments = inject(DepartmentService);
  private readonly teams = inject(TeamService);
  private readonly locations = inject(LocationService);
  private readonly companies = inject(TenantCompanyService);
  private readonly subscription = inject(SubscriptionService);
  private readonly auth = inject(AuthService);
  private readonly hasLocations = computed(() => this.subscription.allows('location'));

  readonly userName = this.auth.user()?.name ?? '';
  readonly isPlatformAdmin = this.auth.role() === 'ADMIN';
  /** The setup checklist and quick actions are admin tasks; regular employees only see the stats. */
  readonly showSetup = this.isPlatformAdmin || this.auth.role() === 'COMPANY';
  readonly stats = computed(() =>
    this.isPlatformAdmin ? PLATFORM_STATS : STATS.filter((stat) => this.hasLocations() || !LOCATION_KEYS.has(stat.key)),
  );
  readonly quickActions = computed(() =>
    this.isPlatformAdmin
      ? PLATFORM_ACTIONS
      : QUICK_ACTIONS.filter((action) => this.hasLocations() || !action.link.startsWith('/locations')),
  );
  /** undefined = loading, null = unavailable, number = count. */
  readonly counts = signal<Partial<Record<StatKey, number | null>>>({});
  readonly steps = computed(() =>
    SETUP_STEPS.filter((step) => this.hasLocations() || !LOCATION_KEYS.has(step.key)).map((step) => ({
      ...step,
      done: (this.counts()[step.key] ?? 0) > 0,
    })),
  );
  readonly stepsDone = computed(() => this.steps().filter((step) => step.done).length);

  constructor() {
    // The subscription loads in the background; count locations only once the module is known to be on.
    effect(() => {
      if (!this.isPlatformAdmin && this.hasLocations()) {
        untracked(() => this.load('locations', this.total(this.locations.list({ page: 1, pageSize: 1 }))));
      }
    });
  }

  ngOnInit(): void {
    if (this.isPlatformAdmin) {
      this.companies.all().pipe(catchError(() => of(null))).subscribe((companies) => {
        this.counts.set({
          companies: companies?.length ?? null,
          activeCompanies: companies ? companies.filter((company) => company.is_active).length : null,
        });
      });
      return;
    }
    this.load('users', this.users.all().pipe(map((items) => items.length)));
    this.load('departments', this.total(this.departments.list({ page: 1, pageSize: 1 })));
    this.load('teams', this.total(this.teams.list({ page: 1, pageSize: 1 })));
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
