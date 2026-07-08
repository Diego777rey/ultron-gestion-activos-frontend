import { Routes } from '@angular/router';

export const PRODUCTOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/productos-list/productos-list.component').then((m) => m.ProductosListComponent),
    data: { tabTitle: 'Productos' }
  },
];
