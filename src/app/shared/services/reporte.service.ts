import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, tap, throwError } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { AbrirReporteOpciones, REPORTE_TITULO_HEADER } from '../models/reporte-sesion.model';
import { LoadingService } from './loading.service';
import { NotificationService } from './notification.service';
import { ReporteVisorService } from './reporte-visor.service';

export type TipoReporteInventario =
  | 'producto'
  | 'servicio'
  | 'cliente'
  | 'funcionario'
  | 'usuario'
  | 'transferencia'
  | 'transferencia_detalle'
  | 'solicitud_repuesto'
  | 'orden_trabajo'
  | 'orden_trabajo_detalle'
  | 'historial'
  | 'vehiculo';

export interface ReporteOpciones {
  filtro?: string | null;
  id?: number | null;
  titulo?: string | null;
}

/**
 * Cliente REST del paquete de reportes del backend.
 * Abre el PDF en el visor in-app (tab Reportes), reutilizable desde cualquier pantalla.
 */
@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);
  private readonly visor = inject(ReporteVisorService);
  private readonly loading = inject(LoadingService);

  generar(tipo: TipoReporteInventario, opciones?: ReporteOpciones): Observable<void> {
    return this.loading.track(
      this.obtenerPdf(tipo, opciones).pipe(
        tap((pdf) => {
          this.abrirPdf({
            titulo: opciones?.titulo?.trim() || pdf.titulo || tituloDesdeTipo(tipo),
            filename: pdf.filename,
            blob: pdf.blob,
          });
        }),
        map(() => undefined),
      ),
      {
        message: 'Generando reporte…',
        notifyError: false,
        errorTitle: 'No se pudo generar el reporte',
      },
    );
  }

  generarInventario(tipo: TipoReporteInventario, opciones?: ReporteOpciones): Observable<void> {
    return this.generar(tipo, opciones);
  }

  /** Abre cualquier PDF en el visor in-app, aunque no venga de /api/reportes. */
  abrirPdf(opciones: AbrirReporteOpciones): void {
    this.visor.abrir(opciones);
  }

  private obtenerPdf(
    tipo: TipoReporteInventario,
    opciones?: ReporteOpciones,
  ): Observable<{ blob: Blob; filename: string; titulo: string | null }> {
    let params = new HttpParams();
    const filtro = opciones?.filtro?.trim();
    if (filtro) {
      params = params.set('filtro', filtro);
    }
    if (opciones?.id != null) {
      params = params.set('id', String(opciones.id));
    }

    return this.http
      .get(`${API_CONFIG.reportesEndpoint}/${tipo}`, {
        params,
        responseType: 'blob',
        observe: 'response',
      })
      .pipe(
        map((response) => {
          const raw = response.body;
          if (!raw || raw.size === 0) {
            throw new Error('El reporte está vacío');
          }
          const blob = raw.type === 'application/pdf'
            ? raw
            : new Blob([raw], { type: 'application/pdf' });
          const filename =
            this.filenameFromDisposition(response.headers.get('Content-Disposition')) ??
            `reporte-${tipo}.pdf`;
          const titulo = decodeHeader(response.headers.get(REPORTE_TITULO_HEADER));
          return { blob, filename, titulo };
        }),
        catchError((err: unknown) => this.handleError(err)),
      );
  }

  private filenameFromDisposition(header: string | null): string | null {
    if (!header) {
      return null;
    }
    const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (utfMatch?.[1]) {
      return decodeURIComponent(utfMatch[1]);
    }
    const asciiMatch = /filename="?([^";]+)"?/i.exec(header);
    return asciiMatch?.[1] ?? null;
  }

  private handleError(err: unknown): Observable<never> {
    const fallback = 'No se pudo generar el reporte';
    if (err instanceof HttpErrorResponse && err.error instanceof Blob) {
      return from(err.error.text()).pipe(
        map((text) => {
          try {
            const json = JSON.parse(text) as { message?: string };
            return json.message?.trim() || fallback;
          } catch {
            return fallback;
          }
        }),
        switchMap((message) => {
          this.notifications.error(message);
          return throwError(() => new Error(message));
        }),
      );
    }
    const message = err instanceof Error ? err.message : fallback;
    this.notifications.error(message || fallback);
    return throwError(() => (err instanceof Error ? err : new Error(fallback)));
  }
}

function decodeHeader(value: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  try {
    return decodeURIComponent(value).trim() || null;
  } catch {
    return value.trim();
  }
}

function tituloDesdeTipo(tipo: TipoReporteInventario): string {
  return tipo
    .split('_')
    .filter((parte) => parte.length > 0)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}
