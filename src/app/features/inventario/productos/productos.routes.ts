import { Routes } from '@angular/router';

export const PRODUCTOS_ROUTES: Routes = [
  {
    path: 'nuevo',
    loadComponent: () =>
      import('./pages/producto-stepper/producto-stepper.component').then((m) => m.ProductoStepperComponent),
    data: { tabTitle: 'Nuevo Producto', noReuse: true },
  },
  {
    path: 'categorias/nueva',
    loadComponent: () =>
      import('./pages/categoria-producto-stepper/categoria-producto-stepper.component').then((m) => m.CategoriaProductoStepperComponent),
    data: { tabTitle: 'Nueva Categoría', noReuse: true },
  },
  {
    path: 'categorias/:id/editar',
    loadComponent: () =>
      import('./pages/categoria-producto-stepper/categoria-producto-stepper.component').then((m) => m.CategoriaProductoStepperComponent),
    data: { tabTitle: 'Editar Categoría' },
  },
  {
    path: 'categorias',
    loadComponent: () =>
      import('./pages/categoria-producto-list/categoria-producto-list.component').then((m) => m.CategoriaProductoListComponent),
    data: { tabTitle: 'Categorías de Productos' },
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./pages/productos-list/productos-list.component').then((m) => m.ProductosListComponent),
    data: { tabTitle: 'Productos' },
  },
];
