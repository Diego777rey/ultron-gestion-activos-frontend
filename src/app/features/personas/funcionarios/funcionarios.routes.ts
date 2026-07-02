import { Routes } from '@angular/router';

export const FUNCIONARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/funcionarios-list/funcionarios-list').then((m) => m.FuncionariosListComponent),
    data: { tabTitle: 'Lista de funcionarios' }
  },
];
