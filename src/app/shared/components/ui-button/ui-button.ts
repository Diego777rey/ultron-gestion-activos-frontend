import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Variantes visuales soportadas por el botón genérico. */
export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';
/** Tamaños soportados. */
export type ButtonSize = 'sm' | 'md';

/**
 * Botón genérico reutilizable en todo el sistema.
 * Soporta variantes (primary/outline/ghost/danger), un icono Material opcional,
 * estados deshabilitado/cargando y tipo (button/submit).
 */
@Component({
  selector: 'app-ui-button',
  templateUrl: './ui-button.html',
  styleUrl: './ui-button.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-button-host' },
})
export class UiButtonComponent {
  /** Texto del botón (opcional si solo se usa icono). */
  readonly label = input<string>('');
  /** Nombre del icono Material a mostrar (opcional). */
  readonly icon = input<string>('');
  /** Variante visual. */
  readonly variant = input<ButtonVariant>('primary');
  /** Tamaño del botón. */
  readonly size = input<ButtonSize>('md');
  /** Tipo nativo del botón. */
  readonly type = input<'button' | 'submit'>('button');
  /** Deshabilita el botón. */
  readonly disabled = input<boolean>(false);
  /** Muestra estado de carga. */
  readonly loading = input<boolean>(false);
  /** Renderiza solo el icono (botón circular). */
  readonly iconOnly = input<boolean>(false);
  /** Etiqueta accesible cuando el botón es solo icono. */
  readonly ariaLabel = input<string>('');

  /** Emite al hacer click (si no está deshabilitado/cargando). */
  readonly clicked = output<void>();

  onClick(): void {
    if (!this.disabled() && !this.loading()) {
      this.clicked.emit();
    }
  }
}
