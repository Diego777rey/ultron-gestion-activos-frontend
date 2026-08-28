import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, map, switchMap, throwError } from 'rxjs';
import { API_CONFIG } from '../../config/api.config';
import { NotificationService } from './notification.service';

export type TipoReporteInventario =
  | 'producto'
  | 'servicio'
  | 'cliente'
  | 'funcionario'
  | 'usuario'
  | 'transferencia'
  | 'solicitud_repuesto'
  | 'orden_trabajo'
  | 'historial'
  | 'vehiculo';

export interface ReporteOpciones {
  filtro?: string | null;
  id?: number | null;
}

/**
 * Cliente REST del paquete de reportes del backend.
 * En Electron abre el PDF en una ventana nueva de la app.
 * En el navegador lo muestra en una pestaña con visor embebido.
 */
@Injectable({ providedIn: 'root' })
export class ReporteService {
  private readonly http = inject(HttpClient);
  private readonly notifications = inject(NotificationService);

  generar(tipo: TipoReporteInventario, opciones?: ReporteOpciones): Observable<void> {
    return this.obtenerPdf(tipo, opciones).pipe(
      switchMap((pdf) => from(this.abrirPdf(pdf.blob, pdf.filename))),
    );
  }

  generarInventario(tipo: TipoReporteInventario, opciones?: ReporteOpciones): Observable<void> {
    return this.generar(tipo, opciones);
  }

  private async abrirPdf(blob: Blob, filename: string): Promise<void> {
    if (window.ultronDesktop?.openPdf) {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      await window.ultronDesktop.openPdf(bytes, filename);
      return;
    }
    this.abrirEnPestaña(blob, filename);
  }

  private abrirEnPestaña(blob: Blob, filename: string): void {
    const objectUrl = URL.createObjectURL(blob);
    const tab = window.open('', '_blank');
    if (!tab) {
      this.notifications.error('No se pudo abrir la pestaña del reporte.');
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const title = this.escapeHtml(filename);
    tab.document.open();
    tab.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <style>
      html, body { margin: 0; height: 100%; background: #323639; }
      iframe { border: 0; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <iframe src="${objectUrl}" title="${title}"></iframe>
  </body>
</html>`);
    tab.document.close();
  }

  private obtenerPdf(
    tipo: TipoReporteInventario,
    opciones?: ReporteOpciones,
  ): Observable<{ blob: Blob; filename: string }> {
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
          return { blob, filename };
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

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
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
