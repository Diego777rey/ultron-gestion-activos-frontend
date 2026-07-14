import { Routes } from '@angular/router';

export const SERVICIOS_ROUTES: Routes = [
  {
    path: 'categorias',
    loadComponent: () =>
      import('./pages/categoria-servicio-list/categoria-servicio-list.component').then((m) => m.CategoriaServicioListComponent),
    data: { tabTitle: 'Categorías de Servicios' }
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/servicios-list/servicios-list.component').then((m) => m.ServiciosListComponent),
    data: { tabTitle: 'Servicios' }
  }
];
