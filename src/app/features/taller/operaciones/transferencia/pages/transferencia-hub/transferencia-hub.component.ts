import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface HubCard {
  title: string;
  description: string;
  icon: string;
  route: string;
  accent: 'teal' | 'amber';
}

@Component({
  selector: 'app-transferencia-hub',
  imports: [RouterLink],
  templateUrl: './transferencia-hub.component.html',
  styleUrl: './transferencia-hub.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferenciaHubComponent {
  protected readonly cards: HubCard[] = [
    {
      title: 'Histórico de transferencias',
      description: 'Consultá movimientos entre sectores y registrá una nueva transferencia.',
      icon: 'history',
      route: '/taller/operaciones/transferencia/historico',
      accent: 'teal',
    },
    {
      title: 'Solicitudes de repuestos',
      description: 'Pedidos de mercadería entre sectores. Próximamente disponible.',
      icon: 'request_quote',
      route: '/taller/operaciones/transferencia/solicitudes',
      accent: 'amber',
    },
  ];
}
