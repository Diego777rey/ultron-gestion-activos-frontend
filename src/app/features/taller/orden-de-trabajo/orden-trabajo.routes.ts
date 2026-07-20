import { Routes } from '@angular/router';

export const ORDEN_TRABAJO_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./orden-de-trabajo.component').then((m) => m.OrdenDeTrabajoComponent),
  },
  {
    path: 'detalle/:id',
    loadComponent: () =>
      import('./pages/orden-trabajo-detalle/orden-trabajo-detalle.component').then(
        (m) => m.OrdenTrabajoDetalleComponent
      ),
    data: { tabTitle: 'Detalle de Orden' },
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./pages/orden-trabajo-detalle/orden-trabajo-detalle.component').then(
        (m) => m.OrdenTrabajoDetalleComponent
      ),
    data: { tabTitle: 'Nueva Orden' },
  },
];
