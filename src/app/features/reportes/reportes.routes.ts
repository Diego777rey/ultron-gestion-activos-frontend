import { Routes } from '@angular/router';

export const REPORTES_ROUTES: Routes = [
  {
    path: 'orden-de-trabajo',
    loadComponent: () =>
      import('./pages/reporte-orden-trabajo/reporte-orden-trabajo.component').then(
        (m) => m.ReporteOrdenTrabajoComponent
      ),
    data: { tabTitle: 'Detalle de orden de trabajo' },
  },
];
