import { Routes } from '@angular/router';

/** Lazy routes under /analytics (module `inventory`, like the API). */
export const ANALYTICS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboards/overview' },
  { path: 'dashboards', pathMatch: 'full', redirectTo: 'dashboards/overview' },
  {
    path: 'dashboards/:name',
    loadComponent: () => import('./dashboards/dashboard-page.component').then((m) => m.DashboardPageComponent),
    data: { titleKey: 'analytics.dashboardsTitle' },
  },
  {
    path: 'reports',
    loadComponent: () => import('./reports/report-runner.component').then((m) => m.ReportRunnerComponent),
    data: { titleKey: 'analytics.reportsTitle' },
  },
];
