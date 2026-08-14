import { Directive } from '@angular/core';

/**
 * Aplica layout fijo y ancho completo a cualquier `<table>` para que los
 * anchos/`align` de columnas se respeten sin huecos irregulares.
 *
 * Uso:
 * ```html
 * <table appTableLayout>
 *   <th style="width: 120px" appColumnAlign="right">Precio</th>
 * </table>
 * ```
 *
 * `app-data-table` ya lo incluye internamente; no hace falta duplicarlo ahí.
 */
@Directive({
  selector: 'table[appTableLayout]',
  host: {
    class: 'app-table-layout',
  },
})
export class TableLayoutDirective {}
