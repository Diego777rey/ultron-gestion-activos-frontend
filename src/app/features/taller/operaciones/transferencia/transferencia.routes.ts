import { Routes } from '@angular/router';

export const TRANSFERENCIA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/transferencias-list/transferencias-list.component').then(
        (m) => m.TransferenciasListComponent
      ),
    data: { tabTitle: 'Transferencias' },
  },
  {
    path: 'historico',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'nueva',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: 'solicitudes',
    loadComponent: () =>
      import('./pages/solicitudes-repuesto-list/solicitudes-repuesto-list.component').then(
        (m) => m.SolicitudesRepuestoListComponent
      ),
    data: { tabTitle: 'Solicitudes de repuestos' },
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/transferencia-gestion/transferencia-gestion.component').then(
        (m) => m.TransferenciaGestionComponent
      ),
    data: { tabTitle: 'Gestión de transferencia' },
  },
];
