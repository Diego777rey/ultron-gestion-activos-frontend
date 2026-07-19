import { Routes } from '@angular/router';

export const TRANSFERENCIA_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/transferencia-hub/transferencia-hub.component').then(
        (m) => m.TransferenciaHubComponent
      ),
    data: { tabTitle: 'Transferencia' },
  },
  {
    path: 'historico',
    loadComponent: () =>
      import('./pages/transferencias-list/transferencias-list.component').then(
        (m) => m.TransferenciasListComponent
      ),
    data: { tabTitle: 'Histórico de transferencias' },
  },
  {
    path: 'nueva',
    redirectTo: 'historico',
    pathMatch: 'full',
  },
  {
    path: 'solicitudes',
    loadComponent: () =>
      import('./pages/operacion-placeholder/operacion-placeholder.component').then(
        (m) => m.OperacionPlaceholderComponent
      ),
    data: {
      tabTitle: 'Solicitudes de repuestos',
      title: 'Solicitudes de repuestos',
      subtitle: 'Gestión de pedidos de repuestos entre sectores',
      icon: 'request_quote',
    },
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
