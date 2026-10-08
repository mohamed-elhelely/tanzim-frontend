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
  {
    path: 'reports',
    loadComponent: () => import('./reports/report-viewer.component').then((m) => m.ReportViewerComponent),
    data: { titleKey: 'accounting.reports.title' },
  },
  {
    path: 'supplier-payments',
    loadComponent: () => import('./supplier-payments/supplier-payment-list.component').then((m) => m.SupplierPaymentListComponent),
    data: { titleKey: 'accounting.payments.title' },
  },
  {
    path: 'supplier-payments/new',
    loadComponent: () => import('./supplier-payments/supplier-payment-form.component').then((m) => m.SupplierPaymentFormComponent),
    data: { titleKey: 'accounting.payments.new' },
  },
  {
    path: 'supplier-payments/:id',
    loadComponent: () => import('./supplier-payments/supplier-payment-detail.component').then((m) => m.SupplierPaymentDetailComponent),
    data: { titleKey: 'accounting.payments.detail' },
  },
  {
    path: 'debit-notes',
    loadComponent: () => import('./debit-notes/debit-note-list.component').then((m) => m.DebitNoteListComponent),
    data: { titleKey: 'accounting.notes.title' },
  },
  {
    path: 'debit-notes/new',
    loadComponent: () => import('./debit-notes/debit-note-form.component').then((m) => m.DebitNoteFormComponent),
    data: { titleKey: 'accounting.notes.new' },
  },
  {
    path: 'debit-notes/:id',
    loadComponent: () => import('./debit-notes/debit-note-detail.component').then((m) => m.DebitNoteDetailComponent),
    data: { titleKey: 'accounting.notes.detail' },
  },
  {
    path: 'debit-notes/:id/edit',
    loadComponent: () => import('./debit-notes/debit-note-form.component').then((m) => m.DebitNoteFormComponent),
    data: { titleKey: 'accounting.notes.edit' },
  },
];
