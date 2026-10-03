import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, merge, of, switchMap, timeout } from 'rxjs';
import { API_CONFIG, resolveApiBaseUrl } from '../../config/api.config';
import { ConfiguracionService } from '../../shared/services/configuracion.service';

/** Cada cuánto se vuelve a preguntar si el servidor sigue respondiendo. */
const INTERVALO_MS = 15_000;
const TIMEOUT_MS = 5_000;

export type EstadoConexion = 'comprobando' | 'en-linea' | 'sin-red' | 'sin-servidor';

const ETIQUETAS: Record<EstadoConexion, string> = {
  comprobando: 'Comprobando',
  'en-linea': 'En línea',
  'sin-red': 'Sin internet',
  'sin-servidor': 'Sin servidor',
};

/**
 * Separa "esta PC no tiene red" de "hay red, pero el servidor no contesta".
 * Un código HTTP (aunque sea 4xx o 500) significa que el proceso respondió.
 * Sin respuesta, 502, 503 o 504 significan que no se pudo comunicar.
 */
export function clasificarErrorDeRed(error: unknown, navegadorEnLinea: boolean): EstadoConexion {
  if (!navegadorEnLinea) {
    return 'sin-red';
  }
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504) {
      return 'sin-servidor';
    }
    return 'en-linea';
  }
  return 'sin-servidor';
}

export function hostDelServidor(baseUrl: string): string {
  try {
    return new URL(baseUrl).host;
  } catch {
    return baseUrl;
  }
}

function detalleDe(estado: EstadoConexion, servidor: string): string {
  switch (estado) {
    case 'en-linea':
      return `Conectado a ${servidor}. El servidor responde. Clic para comprobar de nuevo.`;
    case 'sin-red':
      return 'Esta computadora no tiene internet. Por eso no se puede comunicar con el servidor. Clic para comprobar de nuevo.';
    case 'sin-servidor':
      return `Esta computadora tiene red, pero ${servidor} no responde. El servidor puede estar caído o esta red no tiene salida a internet. Clic para comprobar de nuevo.`;
    default:
      return `Comprobando si ${servidor} responde…`;
  }
}

@Injectable({ providedIn: 'root' })
export class ConectividadService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly configuracion = inject(ConfiguracionService);
  private readonly disparo = new Subject<void>();
  private sondeo: ReturnType<typeof setInterval> | null = null;

  private readonly servidor = signal(hostDelServidor(resolveApiBaseUrl()));
  readonly estado = signal<EstadoConexion>(this.hayRedLocal() ? 'comprobando' : 'sin-red');
  readonly etiqueta = computed(() => ETIQUETAS[this.estado()]);
  readonly detalle = computed(() => detalleDe(this.estado(), this.servidor()));

  constructor() {
    merge(this.disparo, this.configuracion.configChanged)
      .pipe(
        switchMap(() => this.pedirEstado()),
        takeUntilDestroyed(),
      )
      .subscribe((estado) => this.estado.set(estado));
  }

  /** Arranca el sondeo periódico. Lo llama la barra superior, una sola vez. */
  iniciar(): void {
    if (this.sondeo) {
      return;
    }
    window.addEventListener('online', this.alCambiarRed);
    window.addEventListener('offline', this.alCambiarRed);
    document.addEventListener('visibilitychange', this.alVolver);
    this.sondeo = setInterval(() => this.reintentar(), INTERVALO_MS);
    this.destroyRef.onDestroy(() => this.detener());
    this.reintentar();
  }

  reintentar(): void {
    this.refrescarServidor();
    this.disparo.next();
  }

  /** Cualquier respuesta HTTP del backend cuenta como comunicación. */
  registrarRespuesta(): void {
    this.refrescarServidor();
    this.estado.set('en-linea');
  }

  registrarFallo(error: unknown): void {
    this.refrescarServidor();
    this.estado.set(clasificarErrorDeRed(error, this.hayRedLocal()));
  }

  private pedirEstado() {
    this.refrescarServidor();
    if (!this.hayRedLocal()) {
      return of<EstadoConexion>('sin-red');
    }
    return this.http.get(API_CONFIG.healthEndpoint).pipe(
      timeout(TIMEOUT_MS),
      map((): EstadoConexion => 'en-linea'),
      catchError((error: unknown) => of(clasificarErrorDeRed(error, this.hayRedLocal()))),
    );
  }

  private refrescarServidor(): void {
    this.servidor.set(hostDelServidor(resolveApiBaseUrl()));
  }

  private hayRedLocal(): boolean {
    return typeof navigator === 'undefined' || navigator.onLine;
  }

  private readonly alCambiarRed = (): void => {
    if (!this.hayRedLocal()) {
      this.estado.set('sin-red');
      return;
    }
    this.reintentar();
  };

  private readonly alVolver = (): void => {
    if (document.visibilityState === 'visible') {
      this.reintentar();
    }
  };

  private detener(): void {
    window.removeEventListener('online', this.alCambiarRed);
    window.removeEventListener('offline', this.alCambiarRed);
    document.removeEventListener('visibilitychange', this.alVolver);
    if (this.sondeo) {
      clearInterval(this.sondeo);
      this.sondeo = null;
    }
  }
}
