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
  /** Ancho CSS opcional de la columna (ej: '120px', '20%'). */
  width?: string;
  /** Alineación del contenido de la celda. */
  align?: 'left' | 'center' | 'right';
  /** Oculta la columna sin eliminarla de la configuración. */
  hidden?: boolean;
}

/** Alineación válida para celdas/columnas. */
export type ColumnAlign = NonNullable<TableColumn['align']>;
