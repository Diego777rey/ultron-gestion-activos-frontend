import { Routes } from '@angular/router';

export const EMPRESAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/empresas-list/empresas-list').then((m) => m.EmpresasListComponent),
  },
];
