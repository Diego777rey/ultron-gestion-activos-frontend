import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Modal / diálogo genérico reutilizable.
 * Renderiza un overlay con panel centrado, encabezado con título y botón de cierre,
 * un cuerpo proyectado por defecto y un pie opcional (`[modal-footer]`).
 * Se cierra con Escape o click en el backdrop.
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class ModalComponent {
  /** Controla la visibilidad del modal. */
  readonly open = input<boolean>(false);
  /** Título mostrado en el encabezado. */
  readonly title = input<string>('');
  /** Subtítulo opcional bajo el título. */
  readonly subtitle = input<string>('');
  /** Ancho máximo del panel (CSS). */
  readonly maxWidth = input<string>('560px');
  /** Permite cerrar al hacer click en el backdrop. */
  readonly closeOnBackdrop = input<boolean>(true);

  /** Se emite al solicitar el cierre del modal. */
  readonly closed = output<void>();

  protected onBackdrop(): void {
    if (this.closeOnBackdrop()) {
      this.closed.emit();
    }
  }

  protected onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
