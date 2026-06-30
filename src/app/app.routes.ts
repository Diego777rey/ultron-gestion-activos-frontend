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
        path: 'personas/funcionarios',
        loadChildren: () =>
          import('./features/personas/funcionarios/funcionarios.routes').then(
            (m) => m.FUNCIONARIOS_ROUTES
          ),
      },
      {
        path: 'personas/roles',
        loadChildren: () =>
          import('./features/personas/roles/roles.routes').then(
            (m) => m.ROLES_ROUTES
          ),
      },
      {
        path: 'personas/usuarios',
        loadChildren: () =>
          import('./features/personas/usuarios/usuarios.routes').then(
            (m) => m.USUARIOS_ROUTES
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
