import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Banda de error reutilizable con mensaje y botón opcional de reintento.
 * Ideal para formularios, listados o paneles locales (no toast).
 */
@Component({
  selector: 'app-error-banner',
  templateUrl: './error-banner.html',
  styleUrl: './error-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorBannerComponent {
  /** Mensaje a mostrar. Si es null/vacío, el banner no se renderiza. */
  readonly message = input<string | null>(null);
  /** Muestra el botón "Reintentar". */
  readonly showRetry = input(false);
  /** Etiqueta del botón de reintento. */
  readonly retryLabel = input('Reintentar');
  /** Emite al pulsar reintentar. */
  readonly retry = output<void>();

  protected onRetry(): void {
    this.retry.emit();
  }
}
