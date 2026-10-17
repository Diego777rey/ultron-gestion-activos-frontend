import { Routes } from '@angular/router';

export const RETIROS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/retiros-list-page/retiros-list-page.component').then(
        (m) => m.RetirosListPageComponent,
      ),
    data: { tabTitle: 'Lista de retiros' },
  },
];
