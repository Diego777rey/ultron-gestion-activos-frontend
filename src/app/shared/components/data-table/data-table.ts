import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
  output,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { TableColumn } from '../../models/table-column.model';
import { TableCellContext, TableCellDirective } from './table-cell.directive';

/**
 * Tabla genérica reutilizable en todo el sistema.
 *
 * - Recibe la configuración de columnas (`columns`) y los datos (`data`).
 * - Renderiza por defecto el valor de cada celda, o una plantilla personalizada
 *   provista por el consumidor mediante la directiva `appTableCell`.
 * - Maneja estados de carga y vacío de forma uniforme.
 *
 * @template T Tipo de la fila de datos.
 */
@Component({
  selector: 'app-data-table',
  imports: [NgTemplateOutlet],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'data-table-host' },
})
export class DataTableComponent<T = Record<string, unknown>> {
  /** Configuración de columnas. */
  readonly columns = input.required<TableColumn<T>[]>();
  /** Datos a mostrar (ya filtrados/paginados por el consumidor). */
  readonly data = input<readonly T[]>([]);
  /** Indica si los datos se están cargando. */
  readonly loading = input<boolean>(false);
  /** Función para identificar de forma única cada fila (mejora el `track`). */
  readonly trackBy = input<(row: T) => unknown>((row) => row);
  /** Mensaje a mostrar cuando no hay datos. */
  readonly emptyMessage = input<string>('No se encontraron registros');

  /** Se emite al hacer click sobre una fila. */
  readonly rowClick = output<T>();

  /**
   * Plantillas de celda reenviadas por un contenedor padre (ej. `app-generic-list`).
   * Si no se proveen, se usan las definidas como hijos directos de esta tabla.
   */
  readonly cellTemplates = input<readonly TableCellDirective<unknown>[] | undefined>(
    undefined
  );

  private readonly localCellTemplates = contentChildren(TableCellDirective);

  private readonly resolvedCellTemplates = computed(() => {
    const forwarded = this.cellTemplates();
    return forwarded?.length ? forwarded : this.localCellTemplates();
  });

  /** Columnas visibles (excluye las marcadas como ocultas). */
  protected readonly visibleColumns = computed(() =>
    this.columns().filter((c) => !c.hidden)
  );

  /** Devuelve la plantilla personalizada de una columna, si existe. */
  protected templateFor(key: string) {
    return this.resolvedCellTemplates().find((t) => t.appTableCell() === key)?.template ?? null;
  }

  /** Resuelve el valor textual por defecto de una celda. */
  protected cellValue(column: TableColumn<T>, row: T): string {
    if (column.value) {
      const result = column.value(row);
      return result == null ? '' : String(result);
    }
    const raw = (row as Record<string, unknown>)[column.key];
    return raw == null ? '' : String(raw);
  }

  protected context(row: T, index: number): TableCellContext<T> {
    return { $implicit: row, index };
  }

  protected onRowClick(row: T): void {
    this.rowClick.emit(row);
  }

  protected trackRow = (index: number, row: T): unknown => this.trackBy()(row) ?? index;
}
