import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';
import { OtDiagnosticoHallazgosComponent } from '../ot-diagnostico-hallazgos/ot-diagnostico-hallazgos.component';
import { OtSolicitudRepuestoComponent } from '../ot-solicitud-repuesto/ot-solicitud-repuesto.component';

@Component({
  selector: 'app-ot-en-proceso-step',
  imports: [OtDetalleLineasComponent, OtSolicitudRepuestoComponent, OtDiagnosticoHallazgosComponent],
  template: `
    <div class="ot-en-proceso">
      @if (orden().id_orden_trabajo) {
        <app-ot-solicitud-repuesto
          [idOrden]="orden().id_orden_trabajo!"
          [editable]="true"
          (errorChange)="errorChange.emit($event)"
          (solicitudCreada)="recargarOrden()"
        />
      }

      <app-ot-diagnostico-hallazgos
        [orden]="orden()"
        [editable]="true"
        [modoEnProceso]="true"
        (ordenChange)="ordenChange.emit($event)"
        (errorChange)="errorChange.emit($event)"
      />

      <app-ot-detalle-lineas
        [orden]="orden()"
        [editable]="true"
        [allowCreateServicio]="true"
        [modoEnProceso]="true"
        (ordenChange)="ordenChange.emit($event)"
        (errorChange)="errorChange.emit($event)"
      />
    </div>
  `,
  styleUrls: ['../../styles/ot-form.scss', './ot-en-proceso-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtEnProcesoStepComponent {
  private readonly ordenService = inject(OrdenTrabajoService);

  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected recargarOrden(): void {
    const id = this.orden().id_orden_trabajo;
    if (!id) return;
    this.ordenService.findById(id).subscribe({
      next: (updated) => {
        if (updated) this.ordenChange.emit(updated);
      },
      error: (err) => {
        this.errorChange.emit(err?.message ?? 'No se pudo actualizar el presupuesto');
      },
    });
  }
}
