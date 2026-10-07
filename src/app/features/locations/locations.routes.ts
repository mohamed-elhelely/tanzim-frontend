import { Routes } from '@angular/router';

/** Lazy routes under /locations. Each resource has its list, new and edit routes. */
export const LOCATIONS_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'sites' },
  {
    path: 'sites',
    loadComponent: () => import('./sites/site-list.component').then((m) => m.SiteListComponent),
    data: { titleKey: 'locations.sites.title' },
  },
  {
    path: 'sites/new',
    loadComponent: () => import('./sites/site-form.component').then((m) => m.SiteFormComponent),
    data: { titleKey: 'locations.sites.new' },
  },
  {
    path: 'sites/:id/edit',
    loadComponent: () => import('./sites/site-form.component').then((m) => m.SiteFormComponent),
    data: { titleKey: 'locations.sites.edit' },
  },
  {
    path: 'countries',
    loadComponent: () => import('./countries/country-list.component').then((m) => m.CountryListComponent),
    data: { titleKey: 'locations.countries.title' },
  },
  {
    path: 'countries/new',
    loadComponent: () => import('./countries/country-form.component').then((m) => m.CountryFormComponent),
    data: { titleKey: 'locations.countries.new' },
  },
  {
    path: 'countries/:id/edit',
    loadComponent: () => import('./countries/country-form.component').then((m) => m.CountryFormComponent),
    data: { titleKey: 'locations.countries.edit' },
  },
  {
    path: 'regions',
    loadComponent: () => import('./regions/region-list.component').then((m) => m.RegionListComponent),
    data: { titleKey: 'locations.regions.title' },
  },
  {
    path: 'regions/new',
    loadComponent: () => import('./regions/region-form.component').then((m) => m.RegionFormComponent),
    data: { titleKey: 'locations.regions.new' },
  },
  {
    path: 'regions/:id/edit',
    loadComponent: () => import('./regions/region-form.component').then((m) => m.RegionFormComponent),
    data: { titleKey: 'locations.regions.edit' },
  },
  {
    path: 'cities',
    loadComponent: () => import('./cities/city-list.component').then((m) => m.CityListComponent),
    data: { titleKey: 'locations.cities.title' },
  },
  {
    path: 'cities/new',
    loadComponent: () => import('./cities/city-form.component').then((m) => m.CityFormComponent),
    data: { titleKey: 'locations.cities.new' },
  },
  {
    path: 'cities/:id/edit',
    loadComponent: () => import('./cities/city-form.component').then((m) => m.CityFormComponent),
    data: { titleKey: 'locations.cities.edit' },
  },
  {
    path: 'districts',
    loadComponent: () => import('./districts/district-list.component').then((m) => m.DistrictListComponent),
    data: { titleKey: 'locations.districts.title' },
  },
  {
    path: 'districts/new',
    loadComponent: () => import('./districts/district-form.component').then((m) => m.DistrictFormComponent),
    data: { titleKey: 'locations.districts.new' },
  },
  {
    path: 'districts/:id/edit',
    loadComponent: () => import('./districts/district-form.component').then((m) => m.DistrictFormComponent),
    data: { titleKey: 'locations.districts.edit' },
  },
];
