import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, catchError, map, merge, of, switchMap, timeout } from 'rxjs';
import { API_CONFIG, resolveApiBaseUrl } from '../../config/api.config';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { LoadingService } from '../../shared/services/loading.service';
import { NotificationService } from '../../shared/services/notification.service';
import { AuthService } from '../auth/auth.service';

/** Cada cuánto se vuelve a preguntar si el servidor sigue respondiendo. */
const INTERVALO_MS = 15_000;
const TIMEOUT_MS = 5_000;
/** Tras estar oculta o sin foco este tiempo, al volver se fuerza recuperación. */
const INACTIVIDAD_MIN_MS = 30_000;
/** Evita disparar recuperación varias veces seguidas (resume + focus + visibility). */
const ENFRIAMIENTO_RECUPERACION_MS = 2_000;

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
  private readonly loading = inject(LoadingService);
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly disparo = new Subject<void>();
  private sondeo: ReturnType<typeof setInterval> | null = null;
  private desregistrarDesktop: (() => void) | undefined;
  private ultimaComunicacionOk = Date.now();
  private ultimaRecuperacion = 0;

  private readonly servidor = signal(hostDelServidor(resolveApiBaseUrl()));
  readonly estado = signal<EstadoConexion>(this.hayRedLocal() ? 'comprobando' : 'sin-red');
  readonly etiqueta = computed(() => ETIQUETAS[this.estado()]);
  readonly detalle = computed(() => detalleDe(this.estado(), this.servidor()));

  /** Emite cuando la app recuperó la conexión tras inactividad o suspensión. */
  readonly recuperado = new Subject<void>();

  constructor() {
    merge(this.disparo, this.configuracion.configChanged)
      .pipe(
        switchMap(() => this.pedirEstado()),
        takeUntilDestroyed(),
      )
      .subscribe((estado) => {
        this.estado.set(estado);
        if (estado === 'en-linea') {
          this.ultimaComunicacionOk = Date.now();
        }
      });
  }

  /** Arranca el sondeo periódico y los listeners de red / suspensión. */
  iniciar(): void {
    if (this.sondeo) {
      return;
    }
    window.addEventListener('online', this.alCambiarRed);
    window.addEventListener('offline', this.alCambiarRed);
    window.addEventListener('focus', this.alEnfocarVentana);
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
    window.addEventListener('pageshow', this.alMostrarPagina);

    this.desregistrarDesktop = window.ultronDesktop?.onSystemResumed?.(() => {
      this.recuperarTrasInactividad(true);
    });

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
    this.ultimaComunicacionOk = Date.now();
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
    this.recuperarTrasInactividad(true);
  };

  private readonly alCambiarVisibilidad = (): void => {
    if (document.visibilityState === 'hidden') {
      return;
    }
    this.considerarRecuperacion(true);
  };

  private readonly alEnfocarVentana = (): void => {
    this.considerarRecuperacion(false);
  };

  private readonly alMostrarPagina = (event: PageTransitionEvent): void => {
    if (event.persisted) {
      this.recuperarTrasInactividad(true);
    }
  };

  private considerarRecuperacion(reintentarSiActivo: boolean): void {
    const sinComunicacionMs = Date.now() - this.ultimaComunicacionOk;
    if (sinComunicacionMs >= INACTIVIDAD_MIN_MS) {
      this.recuperarTrasInactividad(false);
    } else if (reintentarSiActivo) {
      this.reintentar();
    }
  }

  /**
   * Limpia spinners colgados, valida la sesión y vuelve a comprobar el servidor.
   * @param forzado Reservado para eventos del SO (p. ej. despertar); el enfriamiento aplica igual.
   */
  private recuperarTrasInactividad(_forzado: boolean): void {
    const ahora = Date.now();
    if (ahora - this.ultimaRecuperacion < ENFRIAMIENTO_RECUPERACION_MS) {
      return;
    }
    this.ultimaRecuperacion = ahora;

    if (this.auth.isAuthenticated() && this.auth.tokenExpirado()) {
      this.loading.reset();
      this.auth.logout();
      this.notifications.warning('Tu sesión expiró. Iniciá sesión de nuevo.', {
        title: 'Sesión vencida',
      });
      return;
    }

    this.loading.reset();
    this.reintentar();
    this.recuperado.next();
  }

  private detener(): void {
    window.removeEventListener('online', this.alCambiarRed);
    window.removeEventListener('offline', this.alCambiarRed);
    window.removeEventListener('focus', this.alEnfocarVentana);
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    window.removeEventListener('pageshow', this.alMostrarPagina);
    this.desregistrarDesktop?.();
    this.desregistrarDesktop = undefined;
    if (this.sondeo) {
      clearInterval(this.sondeo);
      this.sondeo = null;
    }
  }
}
