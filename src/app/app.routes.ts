import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/pantalla-principal/pantalla/pantalla').then(
        (m) => m.Pantalla
      ),
  },
];
