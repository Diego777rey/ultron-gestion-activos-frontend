import { Routes } from '@angular/router';

export const PRODUCTOS_ROUTES: Routes = [
  {
    path: 'categorias',
    loadComponent: () =>
      import('./pages/categoria-producto-list/categoria-producto-list.component').then((m) => m.CategoriaProductoListComponent),
    data: { tabTitle: 'Categorías de Productos' }
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/productos-list/productos-list.component').then((m) => m.ProductosListComponent),
    data: { tabTitle: 'Productos' }
  }
];
