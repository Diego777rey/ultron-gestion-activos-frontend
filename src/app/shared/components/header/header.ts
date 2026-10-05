import { Component, ChangeDetectionStrategy, DestroyRef, inject, output, signal } from '@angular/core';
import { APP_VERSION } from '../../../config/app-version';
import { ConectividadService } from '../../../core/conectividad/conectividad.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-header-container'
  }
})
export class HeaderComponent {
  private readonly conectividad = inject(ConectividadService);
  toggleSidebar = output<void>();
  protected readonly version = APP_VERSION;
  protected readonly estadoConexion = this.conectividad.estado;
  protected readonly etiquetaConexion = this.conectividad.etiqueta;
  protected readonly detalleConexion = this.conectividad.detalle;
  protected readonly zoomDisponible = typeof window.ultronDesktop?.getZoom === 'function';
  protected readonly zoomPorcentaje = signal(100);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.conectividad.iniciar();
    const desktop = window.ultronDesktop;
    if (!desktop?.getZoom) {
      return;
    }
    void desktop.getZoom().then((factor) => this.zoomPorcentaje.set(porcentajeZoom(factor)));
    const dejarDeEscuchar = desktop.onZoomChanged?.((factor) => {
      this.zoomPorcentaje.set(porcentajeZoom(factor));
    });
    if (dejarDeEscuchar) {
      this.destroyRef.onDestroy(dejarDeEscuchar);
    }
  }

  onMenuClick() {
    this.toggleSidebar.emit();
  }

  comprobarConexion(): void {
    this.conectividad.reintentar();
  }

  acercar(): void {
    void window.ultronDesktop?.zoomIn?.().then((factor) => this.zoomPorcentaje.set(porcentajeZoom(factor)));
  }

  alejar(): void {
    void window.ultronDesktop?.zoomOut?.().then((factor) => this.zoomPorcentaje.set(porcentajeZoom(factor)));
  }

  restablecerZoom(): void {
    void window.ultronDesktop?.resetZoom?.().then((factor) => this.zoomPorcentaje.set(porcentajeZoom(factor)));
  }
}

function porcentajeZoom(factor: number): number {
  return Math.round(factor * 100);
}
