import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-punto-de-venta',
  imports: [],
  templateUrl: './punto-de-venta.component.html',
  styleUrl: './punto-de-venta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class PuntoDeVentaComponent {}
