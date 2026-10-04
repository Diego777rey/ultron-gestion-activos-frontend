import { Component, ChangeDetectionStrategy, inject, output } from '@angular/core';
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

  constructor() {
    this.conectividad.iniciar();
  }

  onMenuClick() {
    this.toggleSidebar.emit();
  }

  comprobarConexion(): void {
    this.conectividad.reintentar();
  }
}
