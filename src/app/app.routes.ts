import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';

export const routes: Routes = [
  {
    path: '',
    component: MainLayoutComponent,
    children: [
      {
        path: 'pantalla-principal',
        loadComponent: () =>
          import('./features/pantalla-principal/pantalla/pantalla').then(
            (m) => m.Pantalla
          ),
      },
      {
        path: 'personas/clientes',
        loadChildren: () =>
          import('./features/personas/clientes/clientes.routes').then(
            (m) => m.CLIENTES_ROUTES
          ),
      },
      {
        path: '',
        redirectTo: 'pantalla-principal',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
