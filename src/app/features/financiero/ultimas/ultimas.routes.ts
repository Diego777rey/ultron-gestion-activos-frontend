import { Routes } from '@angular/router';

export const ULTIMAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/ultimas-page/ultimas-page.component').then((m) => m.UltimasPageComponent),
    data: { tabTitle: 'Control de caja' },
  },
  {
    path: ':idSesion/ventas',
    loadComponent: () =>
      import('./pages/sesion-ventas-page/sesion-ventas-page.component').then(
        (m) => m.SesionVentasPageComponent,
      ),
    data: { tabTitle: 'Ventas de la caja' },
  },
];
