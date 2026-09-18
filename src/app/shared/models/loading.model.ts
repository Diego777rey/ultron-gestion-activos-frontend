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

/** Tiempo mínimo (ms) que el spinner permanece visible ante un error. */
export const MIN_ERROR_DELAY_MS = 3500;
