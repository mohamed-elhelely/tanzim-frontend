import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, catchError, map, of } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { DepartmentService } from '../company/departments/department.service';
import { TeamService } from '../company/teams/team.service';
import { CompanyUserService } from '../company/users/company-user.service';
import { LocationService } from '../locations/location.service';

type StatKey = 'users' | 'departments' | 'teams' | 'locations';

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

  readonly userName = inject(AuthService).user()?.name ?? '';
  readonly stats = STATS;
  readonly quickActions = QUICK_ACTIONS;
  /** undefined = loading, null = unavailable (e.g. no Locations module), number = count. */
  readonly counts = signal<Record<StatKey, number | null | undefined>>({
    users: undefined,
    departments: undefined,
    teams: undefined,
    locations: undefined,
  });
  readonly steps = computed(() =>
    SETUP_STEPS.map((step) => ({ ...step, done: (this.counts()[step.key] ?? 0) > 0 })),
  );
  readonly stepsDone = computed(() => this.steps().filter((step) => step.done).length);

  ngOnInit(): void {
    this.load('users', this.users.all().pipe(map((items) => items.length)));
    this.load('departments', this.total(this.departments.list({ page: 1, pageSize: 1 })));
    this.load('teams', this.total(this.teams.list({ page: 1, pageSize: 1 })));
    this.load('locations', this.total(this.locations.list({ page: 1, pageSize: 1 })));
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
