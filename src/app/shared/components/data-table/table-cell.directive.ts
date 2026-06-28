import { Directive, TemplateRef, inject, input } from '@angular/core';

/** Contexto disponible dentro de una plantilla de celda. */
export interface TableCellContext<T = unknown> {
  /** Fila actual. Accesible con `let-row`. */
  $implicit: T;
  /** Índice de la fila. Accesible con `let-i="index"`. */
  index: number;
}

/**
 * Directiva estructural para definir el render personalizado de una columna
 * dentro del componente genérico de tabla.
 *
 * Uso:
 * ```html
 * <app-data-table [columns]="cols" [data]="rows">
 *   <ng-template appTableCell="documento" let-row>
 *     <strong>{{ row.documento }}</strong>
 *   </ng-template>
 * </app-data-table>
 * ```
 */
@Directive({
  selector: '[appTableCell]',
})
export class TableCellDirective<T = unknown> {
  readonly template = inject(TemplateRef<TableCellContext<T>>);

  /** Clave de la columna a la que aplica esta plantilla. */
  readonly appTableCell = input.required<string>();

  /**
   * Ancla opcional de tipado: enlaza aquí el arreglo de datos de la tabla
   * (ej: `[appTableCellFrom]="rows()"`) para que `let-row` quede tipado.
   */
  readonly appTableCellFrom = input<readonly T[]>();

  /** Ayuda de inferencia de tipos para el contexto de la plantilla. */
  static ngTemplateContextGuard<T>(
    _dir: TableCellDirective<T>,
    _ctx: unknown
  ): _ctx is TableCellContext<T> {
    return true;
  }
}
