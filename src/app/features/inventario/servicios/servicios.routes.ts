import { Routes } from '@angular/router';

export const SERVICIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/servicios-list/servicios-list.component').then((m) => m.ServiciosListComponent),
    data: { tabTitle: 'Servicios' }
  },
];

