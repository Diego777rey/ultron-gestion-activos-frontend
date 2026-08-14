import { computed, Directive, input } from '@angular/core';
import { ColumnAlign } from '../models/table-column.model';

/**
 * Alinea el contenido de `th` / `td` (o cualquier celda) de forma consistente
 * en toda la app. Úsala en tablas custom o queda aplicada automáticamente
 * por `app-data-table` vía la config `columns[].align`.
 *
 * Uso:
 * ```html
 * <th [appColumnAlign]="'right'">Precio</th>
 * <td [appColumnAlign]="'right'">{{ precio }}</td>
 * <td appColumnAlign="center">...</td>
 * ```
 *
 * Clases globales resultantes (definidas en `styles.scss`):
 * - `.col-align-left` | `.col-align-center` | `.col-align-right`
 */
@Directive({
  selector: '[appColumnAlign]',
  host: {
    '[class.col-align-left]': 'resolvedAlign() === "left"',
    '[class.col-align-center]': 'resolvedAlign() === "center"',
    '[class.col-align-right]': 'resolvedAlign() === "right"',
    '[attr.data-col-align]': 'resolvedAlign()',
  },
})
export class ColumnAlignDirective {
  /** Alineación deseada. Por defecto `left`. */
  readonly appColumnAlign = input<ColumnAlign | ''>('left');

  protected readonly resolvedAlign = computed<ColumnAlign>(() => {
    const value = this.appColumnAlign();
    return value === '' || value == null ? 'left' : value;
  });
}
