import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { NoCloseOnOutsideDirective } from '../../directives/no-close-on-outside.directive';

/**
 * Modal / diálogo genérico reutilizable.
 * Renderiza un overlay con panel centrado, encabezado con título y botón de cierre,
 * un cuerpo proyectado por defecto y un pie opcional (`[modal-footer]`).
 * Se cierra con Escape. El click en el backdrop no cierra (directiva `appNoCloseOnOutside`).
 */
@Component({
  selector: 'app-modal',
  templateUrl: './modal.html',
  styleUrl: './modal.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'onEscape()',
  },
  hostDirectives: [
    {
      directive: NoCloseOnOutsideDirective,
      inputs: ['appNoCloseOnOutside'],
    },
  ],
})
export class ModalComponent implements OnInit, OnDestroy {
  private readonly hostEl = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly noCloseOnOutside = inject(NoCloseOnOutsideDirective);
  /** Controla la visibilidad del modal. */
  readonly open = input<boolean>(false);
  /** Título mostrado en el encabezado. */
  readonly title = input<string>('');
  /** Subtítulo opcional bajo el título. */
  readonly subtitle = input<string>('');
  /** Ancho máximo del panel (CSS). */
  readonly maxWidth = input<string>('560px');
  /** Permite cerrar al hacer click en el backdrop. Por defecto no cierra. */
  readonly closeOnBackdrop = input<boolean>(false);
  /** Permite cerrar con la tecla Escape. */
  readonly closeOnEscape = input<boolean>(true);
  /** Elimina el padding del cuerpo del modal. */
  readonly noPadding = input<boolean>(false);
  /** Variante del encabezado. */
  readonly headerVariant = input<'default' | 'primary'>('default');

  /** Se emite al solicitar el cierre del modal. */
  readonly closed = output<void>();

  /**
   * El overlay es `position: fixed`, pero un ancestro con `transform`, `filter`,
   * `backdrop-filter` o `contain` lo convertiría en su bloque contenedor y el modal
   * quedaría recortado dentro de esa tarjeta. Montarlo en `body` lo evita siempre.
   */
  ngOnInit(): void {
    this.document.body.appendChild(this.hostEl.nativeElement);
  }

  ngOnDestroy(): void {
    this.hostEl.nativeElement.remove();
  }

  protected onBackdrop(): void {
    const preventClose = this.noCloseOnOutside.isEnabled() && !this.closeOnBackdrop();
    if (!preventClose) {
      this.closed.emit();
    }
  }

  protected onEscape(): void {
    if (this.open() && this.closeOnEscape()) {
      this.closed.emit();
    }
  }

  protected close(): void {
    this.closed.emit();
  }
}
