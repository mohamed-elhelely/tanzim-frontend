import { Routes } from '@angular/router';

/** Lazy routes under /accounting (module `accounting`). `…/new` must come before `…/:id`. */
export const ACCOUNTING_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'journal-entries' },
  {
    path: 'accounts',
    loadComponent: () => import('./accounts/account-list.component').then((m) => m.AccountListComponent),
    data: { titleKey: 'accounting.accounts.title' },
  },
  {
    path: 'accounts/new',
    loadComponent: () => import('./accounts/account-form.component').then((m) => m.AccountFormComponent),
    data: { titleKey: 'accounting.accounts.new' },
  },
  {
    path: 'accounts/:id/edit',
    loadComponent: () => import('./accounts/account-form.component').then((m) => m.AccountFormComponent),
    data: { titleKey: 'accounting.accounts.edit' },
  },
  {
    path: 'journal-entries',
    loadComponent: () => import('./journal-entries/journal-entry-list.component').then((m) => m.JournalEntryListComponent),
    data: { titleKey: 'accounting.entries.title' },
  },
  {
    path: 'journal-entries/new',
    loadComponent: () => import('./journal-entries/journal-entry-form.component').then((m) => m.JournalEntryFormComponent),
    data: { titleKey: 'accounting.entries.new' },
  },
  {
    path: 'journal-entries/:id',
    loadComponent: () => import('./journal-entries/journal-entry-detail.component').then((m) => m.JournalEntryDetailComponent),
    data: { titleKey: 'accounting.entries.detail' },
  },
  {
    path: 'journal-entries/:id/edit',
    loadComponent: () => import('./journal-entries/journal-entry-form.component').then((m) => m.JournalEntryFormComponent),
    data: { titleKey: 'accounting.entries.edit' },
  },
  {
    path: 'fiscal-years',
    loadComponent: () => import('./fiscal-years/fiscal-year-page.component').then((m) => m.FiscalYearPageComponent),
    data: { titleKey: 'accounting.years.title' },
  },
];
