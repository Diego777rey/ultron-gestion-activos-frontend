import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  AbrirReporteOpciones,
  REPORTE_VISOR_RUTA,
  ReporteSesion,
} from '../models/reporte-sesion.model';
import { AppDialogService } from './app-dialog.service';

/**
 * Almacén genérico de PDFs abiertos en el visor in-app.
 * Cualquier feature puede llamar `abrir()`: navega al tab Reportes y
 * deja el documento seleccionado. No habla con el backend.
 */
@Injectable({ providedIn: 'root' })
export class ReporteVisorService {
  private readonly router = inject(Router);
  private readonly dialogs = inject(AppDialogService);

  readonly sesiones = signal<ReporteSesion[]>([]);
  readonly activaId = signal<string | null>(null);
  readonly sesionActiva = computed(() => {
    const id = this.activaId();
    return this.sesiones().find((sesion) => sesion.id === id) ?? null;
  });

  abrir(opciones: AbrirReporteOpciones): string {
    const titulo = opciones.titulo.trim() || opciones.filename;
    const sesion: ReporteSesion = {
      id: nuevoId(),
      titulo,
      filename: opciones.filename.trim() || 'reporte.pdf',
      objectUrl: URL.createObjectURL(opciones.blob),
      creadoEn: new Date(),
    };

    this.sesiones.update((actuales) => [sesion, ...actuales]);
    this.activaId.set(sesion.id);
    this.dialogs.closeAll();
    void this.router.navigateByUrl(REPORTE_VISOR_RUTA);
    return sesion.id;
  }

  seleccionar(id: string): void {
    if (this.sesiones().some((sesion) => sesion.id === id)) {
      this.activaId.set(id);
    }
  }

  cerrar(id: string): void {
    const actual = this.sesiones();
    const indice = actual.findIndex((sesion) => sesion.id === id);
    if (indice < 0) {
      return;
    }

    revocar(actual[indice]);
    const restantes = actual.filter((sesion) => sesion.id !== id);
    this.sesiones.set(restantes);

    if (this.activaId() !== id) {
      return;
    }
    const siguiente = restantes[indice] ?? restantes[indice - 1] ?? null;
    this.activaId.set(siguiente?.id ?? null);
  }

  limpiar(): void {
    this.sesiones().forEach(revocar);
    this.sesiones.set([]);
    this.activaId.set(null);
  }
}

function nuevoId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rep-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

function revocar(sesion: ReporteSesion): void {
  URL.revokeObjectURL(sesion.objectUrl);
}
