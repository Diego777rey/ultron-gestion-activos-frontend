import { Routes } from '@angular/router';

export const COMPRAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/compras-list/compras-list').then(
        (m) => m.ComprasListComponent
      ),
    data: { tabTitle: 'Lista de Compras' },
  },
  {
    path: 'nueva',
    loadComponent: () =>
      import('./pages/compra-form/compra-form.component').then(
        (m) => m.CompraFormComponent
      ),
    data: { tabTitle: 'Nueva Compra' },
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/compra-form/compra-form.component').then(
        (m) => m.CompraFormComponent
      ),
    data: { tabTitle: 'Editar Compra' },
  },
  {
    path: 'proveedores',
    loadComponent: () =>
      import('./pages/proveedores-list/proveedores-list').then(
        (m) => m.ProveedoresListComponent
      ),
    data: { tabTitle: 'Proveedores' },
  },
  {
    path: 'vendedores',
    loadComponent: () =>
      import('./pages/vendedores-list/vendedores-list').then(
        (m) => m.VendedoresListComponent
      ),
    data: { tabTitle: 'Vendedores' },
  },
];
