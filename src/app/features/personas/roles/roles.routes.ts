import { Routes } from '@angular/router';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/roles-list/roles-list').then((m) => m.RolesListComponent),
    data: { tabTitle: 'Lista de roles' }
  },
];
