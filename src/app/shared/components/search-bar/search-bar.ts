import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

/**
 * Barra de búsqueda genérica reutilizable.
 * Incluye un campo con icono de lupa, botón de limpiar y emite el término.
 * El valor es bindeable en dos vías con `[(value)]`.
 * Permite proyectar acciones a la derecha (ej: botón de vista) vía `<ng-content>`.
 */
@Component({
  selector: 'app-search-bar',
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'search-bar-host' },
})
export class SearchBarComponent {
  /** Texto de ayuda dentro del campo. */
  readonly placeholder = input<string>('Buscar...');
  /** Valor del término de búsqueda (two-way binding). */
  readonly value = model<string>('');

  /** Se emite (con el término) cada vez que cambia el texto. */
  readonly search = output<string>();
  /** Se emite cuando se limpia la búsqueda. */
  readonly cleared = output<void>();

  onInput(raw: string): void {
    this.value.set(raw);
    this.search.emit(raw);
  }

  clear(): void {
    this.value.set('');
    this.search.emit('');
    this.cleared.emit();
  }
}
