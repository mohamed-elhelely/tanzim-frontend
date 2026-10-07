import { Routes } from '@angular/router';

/** Lazy routes under /locations. */
export const LOCATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./location-list.component').then((m) => m.LocationListComponent),
    data: { titleKey: 'locations.title' },
  },
  {
    path: 'new',
    loadComponent: () => import('./location-form.component').then((m) => m.LocationFormComponent),
    data: { titleKey: 'locations.new' },
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./location-form.component').then((m) => m.LocationFormComponent),
    data: { titleKey: 'locations.edit' },
  },
];
