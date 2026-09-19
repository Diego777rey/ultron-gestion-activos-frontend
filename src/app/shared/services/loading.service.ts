import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, defer, of, throwError, timer } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { LoadingTrackOptions, MIN_ERROR_DELAY_MS } from '../models/loading.model';
import { resolveLoadingErrorMessage } from '../utils/loading-error.util';
import { NotificationService } from './notification.service';

/**
 * Servicio global de carga para mutaciones y operaciones de cualquier pantalla.
 *
 * Uso típico:
 * ```ts
 * this.loading.track(this.productoService.create(payload), {
 *   message: 'Guardando…',
 * }).subscribe({ next: () => ..., error: () => ... });
 * ```
 *
 * Ante un fallo (ej. sin conexión), el spinner permanece al menos ~2 s
 * y después se muestra el mensaje de error.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly notifications = inject(NotificationService);

  /** Contador de operaciones concurrentes. */
  private readonly depth = signal(0);
  private readonly _message = signal<string | null>(null);

  /** True mientras haya al menos una operación activa. */
  readonly visible = computed(() => this.depth() > 0);

  /** Mensaje del overlay (última operación que lo estableció). */
  readonly message = this._message.asReadonly();

  /** Muestra el overlay (o incrementa el contador si ya está visible). */
  show(message?: string): void {
    if (message !== undefined) {
      this._message.set(message);
    }
    this.depth.update((n) => n + 1);
  }

  /** Oculta una capa del overlay. Con depth 0 se limpia el mensaje. */
  hide(): void {
    this.depth.update((n) => Math.max(0, n - 1));
    if (this.depth() === 0) {
      this._message.set(null);
    }
  }

  /** Fuerza el cierre del overlay (útil en cancelaciones globales). */
  reset(): void {
    this.depth.set(0);
    this._message.set(null);
  }

  /**
   * Carga de pantalla / listado: overlay "Cargando…" con el mismo
   * comportamiento de espera mínima ante error que `track`.
   */
  pageLoad<T>(source: Observable<T>, options?: LoadingTrackOptions): Observable<T> {
    return this.track(source, {
      message: 'Cargando…',
      errorTitle: 'No se pudo cargar',
      ...options,
    });
  }

  /**
   * Envuelve un Observable mostrando el overlay global.
   * - Éxito: oculta al emitir (o tras `minSuccessDelayMs` si se indica).
   * - Error: mantiene el spinner al menos `minErrorDelayMs` y luego notifica.
   */
  track<T>(source: Observable<T>, options?: LoadingTrackOptions): Observable<T> {
    const minErrorDelay = options?.minErrorDelayMs ?? MIN_ERROR_DELAY_MS;
    const minSuccessDelay = options?.minSuccessDelayMs ?? 0;
    const notifyError = options?.notifyError ?? true;
    const errorTitle = options?.errorTitle ?? 'No se pudo completar';

    return defer(() => {
      const startedAt = Date.now();
      this.show(options?.message);
      let emitted = false;

      return source.pipe(
        switchMap((value) => {
          const wait = Math.max(0, minSuccessDelay - (Date.now() - startedAt));
          const release = () => {
            emitted = true;
            this.hide();
          };

          if (wait === 0) {
            release();
            return of(value);
          }

          return timer(wait).pipe(
            tap(() => release()),
            map(() => value),
          );
        }),
        tap({
          complete: () => {
            if (!emitted) {
              this.hide();
            }
          },
        }),
        catchError((err: unknown) => {
          const wait = Math.max(0, minErrorDelay - (Date.now() - startedAt));
          const message = resolveLoadingErrorMessage(err, options?.errorMessage);

          return timer(wait).pipe(
            tap(() => {
              this.hide();
              if (notifyError) {
                this.notifications.error(message, { title: errorTitle });
              }
            }),
            switchMap(() => throwError(() => err)),
          );
        }),
      );
    });
  }
}
