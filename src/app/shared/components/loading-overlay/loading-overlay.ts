import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Overlay de carga reutilizable (spinner circular).
 *
 * - Inline (default): cubre el contenedor padre (`position: relative`).
 * - Fullscreen: cubre toda la ventana; lo monta la raíz vía `LoadingService`.
 */
@Component({
  selector: 'app-loading-overlay',
  templateUrl: './loading-overlay.html',
  styleUrl: './loading-overlay.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingOverlayComponent {
  /** Controla la visibilidad del overlay. */
  readonly loading = input(false);
  /** Texto opcional bajo el spinner (ej. "Guardando…"). */
  readonly message = input<string | null>(null);
  /** Si es true, cubre toda la ventana en lugar del contenedor padre. */
  readonly fullscreen = input(false);
}
