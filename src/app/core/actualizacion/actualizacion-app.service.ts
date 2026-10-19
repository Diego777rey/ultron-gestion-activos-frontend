import { Injectable, inject } from '@angular/core';
import { AppUpdateStatus } from '../../../types/ultron-desktop';
import { CanalActualizacion } from '../../shared/models/configuracion-sistema.model';
import { ConfiguracionService } from '../../shared/services/configuracion.service';
import { NotificationService } from '../../shared/services/notification.service';

/**
 * Muestra el aviso de una release nueva y, al hacer clic, pide al proceso
 * de escritorio que descargue e instale esa versión.
 */
@Injectable({ providedIn: 'root' })
export class ActualizacionAppService {
  private readonly notifications = inject(NotificationService);
  private readonly configuracion = inject(ConfiguracionService);
  private avisoId: number | null = null;
  private version = '';
  private instalando = false;
  private escuchando = false;

  iniciar(): void {
    if (this.escuchando) {
      return;
    }
    const desktop = window.ultronDesktop;
    if (!desktop?.onAppUpdate || !desktop.installAppUpdate) {
      return;
    }
    this.escuchando = true;
    this.publicarCanal(this.configuracion.getConfig().canalActualizacion);
    this.configuracion.configChanged.subscribe((config) => {
      this.publicarCanal(config.canalActualizacion);
    });
    desktop.onAppUpdate((status) => this.aplicar(status));
    void desktop.currentAppUpdate?.().then((status) => {
      if (status) {
        this.aplicar(status);
      }
    });
  }

  private publicarCanal(canal: CanalActualizacion): void {
    void window.ultronDesktop?.setUpdateChannel?.(canal);
  }

  private aplicar(status: AppUpdateStatus): void {
    if (status.phase === 'inactivo') {
      this.instalando = false;
      this.ocultarAviso();
      return;
    }
    if (status.phase === 'disponible') {
      if (this.instalando) {
        return;
      }
      this.version = status.version;
      this.mostrarDisponible();
      return;
    }
    if (status.phase === 'descargando') {
      this.instalando = true;
      this.version = status.version || this.version;
      this.mostrarProgreso(status.percent ?? 0);
      return;
    }
    this.instalando = false;
    this.notifications.error(status.message || 'No se pudo actualizar. Intentá de nuevo.', {
      title: 'No se pudo actualizar',
    });
    if (this.version) {
      this.mostrarDisponible();
    }
  }

  private ocultarAviso(): void {
    if (this.avisoId == null) {
      return;
    }
    this.notifications.dismiss(this.avisoId);
    this.avisoId = null;
  }

  private instalar(): void {
    if (this.instalando) {
      return;
    }
    this.instalando = true;
    this.mostrarProgreso(0);
    void window.ultronDesktop?.installAppUpdate?.();
  }

  private mostrarDisponible(): void {
    this.mostrar({
      title: 'Hay una nueva versión',
      message: `La versión ${this.version} ya está publicada. Hacé clic para actualizar. La aplicación se va a reiniciar.`,
      dismissible: true,
      conAccion: true,
    });
  }

  private mostrarProgreso(percent: number): void {
    const avance = Math.min(100, Math.max(0, Math.round(percent)));
    this.mostrar({
      title: 'Actualizando',
      message: `Descargando la versión ${this.version}… ${avance}%`,
      dismissible: false,
      conAccion: false,
      progress: avance,
    });
  }

  private mostrar(options: {
    title: string;
    message: string;
    dismissible: boolean;
    conAccion: boolean;
    progress?: number;
  }): void {
    const action = options.conAccion ? () => this.instalar() : null;
    if (this.avisoId != null && this.notifications.notifications().some((item) => item.id === this.avisoId)) {
      this.notifications.patch(this.avisoId, {
        title: options.title,
        message: options.message,
        dismissible: options.dismissible,
        pinned: true,
        progress: options.progress ?? null,
        action,
        actionLabel: options.conAccion ? 'Actualizar' : null,
      });
      return;
    }
    this.avisoId = this.notifications.info(options.message, {
      title: options.title,
      duration: 0,
      dismissible: options.dismissible,
      icon: 'system_update',
      pinned: true,
      progress: options.progress,
      actionLabel: options.conAccion ? 'Actualizar' : undefined,
      action: action ?? undefined,
    });
  }
}
