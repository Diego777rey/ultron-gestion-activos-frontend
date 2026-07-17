import { Routes } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/pantalla-login/pantalla-login').then(
        (m) => m.PantallaLogin
      ),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
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
        path: 'ventas/punto-de-venta',
        loadComponent: () =>
          import('./features/ventas/punto-de-venta/punto-de-venta.component').then(
            (m) => m.PuntoDeVentaComponent
          ),
        data: { tabTitle: 'Punto de Venta', noReuse: true },
      },
      {
        path: 'taller/orden-de-trabajo',
        loadComponent: () =>
          import('./features/taller/orden-de-trabajo/orden-de-trabajo.component').then(
            (m) => m.OrdenDeTrabajoComponent
          ),
        data: { tabTitle: 'Orden de Trabajo' },
      },
      {
        path: 'activos/vehiculos',
        loadChildren: () =>
          import('./features/activos/vehiculos/vehiculos.routes').then(
            (m) => m.VEHICULOS_ROUTES
          ),
      },
      {
        path: 'financiero/maletines',
        loadComponent: () =>
          import('./features/financiero/maletines/pages/maletines-page/maletines-page.component').then(
            (m) => m.MaletinesPageComponent
          ),
        data: { tabTitle: 'Maletines' },
      },
      {
        path: 'financiero/cajas',
        loadComponent: () =>
          import('./features/financiero/cajas/pages/cajas-page/cajas-page.component').then(
            (m) => m.CajasPageComponent
          ),
        data: { tabTitle: 'Cajas' },
      },
      {
        path: 'inventario/productos',
        loadChildren: () =>
          import('./features/inventario/productos/productos.routes').then(
            (m) => m.PRODUCTOS_ROUTES
          ),
      },
      {
        path: 'inventario/servicios',
        loadChildren: () =>
          import('./features/inventario/servicios/servicios.routes').then(
            (m) => m.SERVICIOS_ROUTES
          ),
      },
      {
        path: 'sectores',
        loadChildren: () =>
          import('./features/sectores/sectores.routes').then(
            (m) => m.SECTORES_ROUTES
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
    redirectTo: 'login',
  },
];

