/**
 * Definición de una columna para el componente genérico de tabla.
 * @template T Tipo de la fila de datos.
 */
export interface TableColumn<T = unknown> {
  /** Identificador único de la columna (usado también para enlazar plantillas de celda). */
  key: string;
  /** Texto del encabezado mostrado en la cabecera de la tabla. */
  header: string;
  /**
   * Accesor opcional para obtener el valor textual de la celda a partir de la fila.
   * Si no se define, se usa `row[key]`.
   */
  value?: (row: T) => string | number | null | undefined;
  /**
   * Ancho CSS opcional de la columna (ej: '120px', '20%').
   * Con `table-layout: fixed`, dejá al menos una columna sin `width`
   * para que absorba el espacio restante y evite huecos irregulares.
   */
  width?: string;
  /**
   * Alineación del encabezado y de las celdas (`appColumnAlign`).
   * Default: `left`. Usá `right` para números/montos y `center` para acciones/ids.
   */
  align?: 'left' | 'center' | 'right';
  /** Oculta la columna sin eliminarla de la configuración. */
  hidden?: boolean;
}

/** Alineación válida para celdas/columnas. */
export type ColumnAlign = NonNullable<TableColumn['align']>;
