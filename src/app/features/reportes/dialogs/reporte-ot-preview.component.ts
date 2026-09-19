import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button';
import { DefaultEmptyPipe } from '../../../shared/pipes/default-empty.pipe';
import { ReporteService } from '../../../shared/services/reporte.service';
import {
  OrdenTrabajoDetalleOutput,
  OrdenTrabajoOutput,
} from '../../taller/orden-de-trabajo/interfaces/orden-trabajo.interface';
import {
  condicionesVehiculoOt,
  etapaInfoOt,
  formatClienteOt,
  formatDocumentoOt,
  formatFechaHoraOt,
  formatFechaOt,
  formatMonedaOt,
  formatPersonaOt,
  formatMecanicoLineaOt,
  formatMecanicosOt,
  formatVehiculoOt,
  hallazgoTextoOt,
  nombreLineaOt,
  totalLineasOt,
} from '../reporte-ot.utils';

@Component({
  selector: 'app-reporte-ot-preview',
  imports: [CommonModule, UiButtonComponent, DefaultEmptyPipe],
  templateUrl: './reporte-ot-preview.component.html',
  styleUrl: './reporte-ot-preview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReporteOtPreviewComponent {
  private readonly reporteService = inject(ReporteService);

  readonly ordenes = input<OrdenTrabajoOutput[]>([]);
  readonly filtro = input<string>('');
  readonly id = input<number | null>(null);

  protected readonly generando = signal(false);

  protected descargarPdf(): void {
    if (this.generando()) {
      return;
    }
    const id = this.id();
    this.generando.set(true);
    this.reporteService
      .generar('orden_trabajo_detalle', id != null ? { id } : { filtro: this.filtro() })
      .subscribe({
        next: () => this.generando.set(false),
        error: () => this.generando.set(false),
      });
  }

  protected formatCliente = formatClienteOt;
  protected formatDocumento = formatDocumentoOt;
  protected formatVehiculo = formatVehiculoOt;
  protected formatPersona = formatPersonaOt;
  protected formatMecanicos = formatMecanicosOt;
  protected formatMecanicoLinea = formatMecanicoLineaOt;
  protected formatFecha = formatFechaOt;
  protected formatFechaHora = formatFechaHoraOt;
  protected formatMoneda = formatMonedaOt;
  protected nombreLinea = nombreLineaOt;
  protected condiciones = condicionesVehiculoOt;
  protected hallazgoTexto = hallazgoTextoOt;
  protected totalLineas = totalLineasOt;
  protected etapaInfo = etapaInfoOt;

  protected trackOrden = (orden: OrdenTrabajoOutput): unknown => orden.id_orden_trabajo;
  protected trackDetalle = (detalle: OrdenTrabajoDetalleOutput): unknown => detalle.id_detalle;
}
