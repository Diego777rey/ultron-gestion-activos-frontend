import { ChangeDetectionStrategy, Component, ElementRef, inject, input, output, signal } from '@angular/core';
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
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Lista de acciones a mostrar. */
  readonly actions = input.required<MenuAction[]>();

  /** Se emite con el id de la acción seleccionada. */
  readonly actionSelected = output<string>();

  protected readonly isOpen = signal(false);
  protected readonly dropdownStyle = signal<Record<string, string>>({});

  protected toggle(event: Event): void {
    event.stopPropagation();
    const next = !this.isOpen();
    if (next) {
      this.positionDropdown();
    }
    this.isOpen.set(next);
  }

  protected select(event: Event, action: MenuAction): void {
    event.stopPropagation();
    this.isOpen.set(false);
    this.actionSelected.emit(action.id);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  private positionDropdown(): void {
    const rect = this.host.nativeElement.getBoundingClientRect();
    const menuWidth = 170;
    const estimatedHeight = 8 + this.actions().length * 40;
    const gap = 6;
    const viewportPadding = 8;

    let top = rect.bottom + gap;
    if (top + estimatedHeight > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, rect.top - estimatedHeight - gap);
    }

    let left = rect.right - menuWidth;
    if (left < viewportPadding) {
      left = viewportPadding;
    }
    if (left + menuWidth > window.innerWidth - viewportPadding) {
      left = window.innerWidth - menuWidth - viewportPadding;
    }

    this.dropdownStyle.set({
      top: `${top}px`,
      left: `${left}px`,
      minWidth: `${menuWidth}px`,
    });
  }
}
