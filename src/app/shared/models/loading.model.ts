/**
 * Estado genérico de una operación asíncrona.
 *
 * @template T Tipo del dato devuelto en caso de éxito.
 *
 * Uso típico:
 * ```ts
 * readonly state = signal<LoadingState<Cliente[]>>({ status: 'idle' });
 * ```
 */
export type LoadingState<T = unknown> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

/**
 * Estado de una mutación CRUD (create / update / remove).
 * No necesita el campo `data` porque el resultado viaja por el Observable.
 */
export type MutationState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

/**
 * Tiempo mínimo (ms) que el spinner permanece visible ante un error
 * antes de mostrar el mensaje al usuario.
 */
export const MIN_ERROR_DELAY_MS = 2000;

/** Tiempo mínimo (ms) del overlay en flujos de éxito prolongados (ej. login). */
export const MIN_SUCCESS_DELAY_MS = 2000;

/** Opciones al envolver un Observable con el overlay global. */
export interface LoadingTrackOptions {
  /** Texto bajo el spinner (ej. "Guardando…", "Eliminando…"). */
  message?: string;
  /**
   * Tiempo mínimo visible ante error. Por defecto `MIN_ERROR_DELAY_MS`.
   * En éxito el overlay se oculta al completar la operación (salvo `minSuccessDelayMs`).
   */
  minErrorDelayMs?: number;
  /**
   * Tiempo mínimo visible ante éxito. Por defecto `0` (oculta al completar).
   * Útil en login u otras transiciones donde se quiere mostrar carga un instante.
   */
  minSuccessDelayMs?: number;
  /**
   * Si es true (default), muestra un toast de error al finalizar la espera mínima.
   * Desactívalo si el componente ya muestra el error por su cuenta.
   */
  notifyError?: boolean;
  /** Título del toast de error. */
  errorTitle?: string;
  /** Mensaje de error forzado (si no se indica, se infiere del error). */
  errorMessage?: string;
}

/**
 * Activa el overlay en consultas de pantalla (`findAll` / `findPaginated` / `findById`).
 * - `true` → overlay "Cargando…" con defaults.
 * - objeto → personaliza mensaje / notificación.
 * Omitirlo (o `false`) para búsquedas inline (entity-searcher, etc.).
 */
export type LoadingQueryOption = boolean | LoadingTrackOptions;
