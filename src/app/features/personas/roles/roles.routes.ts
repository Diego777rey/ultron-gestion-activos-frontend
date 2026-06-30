import { Routes } from '@angular/router';

export const ROLES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/roles-page/roles-page').then((m) => m.RolesPageComponent),
  },
];
