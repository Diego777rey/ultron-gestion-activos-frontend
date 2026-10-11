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
      import('./pages/compras-stepper/compras-stepper.component').then(
        (m) => m.ComprasStepperComponent
      ),
    data: { tabTitle: 'Nueva Compra' },
  },
  {
    path: 'editar/:id',
    loadComponent: () =>
      import('./pages/compras-stepper/compras-stepper.component').then(
        (m) => m.ComprasStepperComponent
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
