/** Estado de paginación usado por el paginador genérico. */
export interface PageState {
  /** Índice de página actual (0-based). */
  pageIndex: number;
  /** Cantidad de elementos por página. */
  pageSize: number;
  /** Total de elementos disponibles (sin paginar). */
  total: number;
}

/** Evento emitido cuando cambia la paginación. */
export interface PageChange {
  pageIndex: number;
  pageSize: number;
}
