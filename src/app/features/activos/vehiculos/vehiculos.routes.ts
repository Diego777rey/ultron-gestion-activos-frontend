import { Routes } from '@angular/router';

export const VEHICULOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/vehiculos-list/vehiculos-list').then((m) => m.VehiculosListComponent),
  },
];
