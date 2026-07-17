import { Routes } from '@angular/router';

export const SECTORES_ROUTES: Routes = [
  {
    path: 'zonas',
    loadComponent: () =>
      import('./pages/zonas-list/zonas-list.component').then((m) => m.ZonasListComponent),
    data: { tabTitle: 'Zonas' },
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/sectores-list/sectores-list.component').then((m) => m.SectoresListComponent),
    data: { tabTitle: 'Sectores' },
  },
];
