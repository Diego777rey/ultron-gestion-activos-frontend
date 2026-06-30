import { Routes } from '@angular/router';

export const FUNCIONARIOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/funcionarios-page/funcionarios-page').then((m) => m.FuncionariosPageComponent),
  },
];
