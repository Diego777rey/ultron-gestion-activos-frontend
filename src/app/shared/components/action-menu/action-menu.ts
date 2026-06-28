import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ClickOutsideDirective } from '../../directives/click-outside.directive';

/** Acción individual dentro del menú de acciones. */
export interface MenuAction {
  /** Identificador devuelto al seleccionar la acción. */
  id: string;
  /** Texto visible. */
  label: string;
  /** Icono Material opcional. */
  icon?: string;
  /** Resalta la acción como destructiva (ej: eliminar). */
  danger?: boolean;
}

/**
 * Menú de acciones genérico (botón de 3 puntos + desplegable).
 * Reutilizable en cualquier fila de tabla u objeto del sistema.
 */
@Component({
  selector: 'app-action-menu',
  imports: [ClickOutsideDirective],
  templateUrl: './action-menu.html',
  styleUrl: './action-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'action-menu-host' },
})
export class ActionMenuComponent {
  /** Lista de acciones a mostrar. */
  readonly actions = input.required<MenuAction[]>();

  /** Se emite con el id de la acción seleccionada. */
  readonly actionSelected = output<string>();

  protected readonly isOpen = signal(false);

  protected toggle(event: Event): void {
    event.stopPropagation();
    this.isOpen.update((open) => !open);
  }

  protected select(event: Event, action: MenuAction): void {
    event.stopPropagation();
    this.isOpen.set(false);
    this.actionSelected.emit(action.id);
  }

  protected close(): void {
    this.isOpen.set(false);
  }
}
