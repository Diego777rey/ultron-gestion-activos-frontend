import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Contenedor genérico de encabezado de página.
 * Muestra título + subtítulo a la izquierda y proyecta acciones a la derecha
 * (botones de adicionar, generar PDF, etc.) mediante `<ng-content>`.
 * Pensado para colocarse arriba de cualquier tabla/listado del sistema.
 */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-header-host' },
})
export class PageHeaderComponent {
  /** Título principal. Ej: 'Gestión de Clientes'. */
  readonly title = input.required<string>();
  /** Subtítulo / descripción opcional debajo del título. */
  readonly subtitle = input<string>('');
}
