import { Routes } from '@angular/router';

export const EQUIPOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/equipos-list/equipos-list').then((m) => m.EquiposListComponent),
  },
];
