import { Routes } from '@angular/router';

export const FACTURAS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/facturas-list/facturas-list.component').then(
        (m) => m.FacturasListComponent
      ),
  },
];
