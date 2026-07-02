import { Routes } from '@angular/router';

export const CLIENTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/clientes-list/clientes-list').then((m) => m.ClientesListComponent),
    data: { tabTitle: 'Lista de clientes' }
  },
];
