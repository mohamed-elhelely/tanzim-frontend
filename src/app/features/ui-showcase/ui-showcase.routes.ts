import { Routes } from '@angular/router';
import { UiShowcaseLayoutComponent } from './ui-showcase-layout.component';

/**
 * /ui: every shared/ui component in all its variants, one page per component. Development builds only
 * (app.routes.ts leaves the route out of production), and outside the shell: no sign-in or backend needed.
 * The page chrome is English on purpose (a developer tool); the components themselves use translation keys so
 * Arabic and RTL can be checked.
 */
export const UI_SHOWCASE_ROUTES: Routes = [
  {
    path: '',
    component: UiShowcaseLayoutComponent,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'buttons' },
      { path: 'buttons', loadComponent: () => import('./pages/buttons-page.component').then((m) => m.ButtonsPageComponent) },
      { path: 'cards', loadComponent: () => import('./pages/cards-page.component').then((m) => m.CardsPageComponent) },
      { path: 'selects', loadComponent: () => import('./pages/selects-page.component').then((m) => m.SelectsPageComponent) },
      {
        path: 'form-controls',
        loadComponent: () => import('./pages/form-controls-page.component').then((m) => m.FormControlsPageComponent),
      },
      { path: 'dialogs', loadComponent: () => import('./pages/dialogs-page.component').then((m) => m.DialogsPageComponent) },
    ],
  },
];

export const UI_SHOWCASE_PAGES = [
  { path: 'buttons', label: 'Buttons' },
  { path: 'cards', label: 'Cards' },
  { path: 'selects', label: 'Selects' },
  { path: 'form-controls', label: 'Toggles & passwords' },
  { path: 'dialogs', label: 'Dialogs' },
];
