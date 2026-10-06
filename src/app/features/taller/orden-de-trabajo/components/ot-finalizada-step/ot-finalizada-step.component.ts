import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrdenTrabajoOutput, unidadOrden } from '../../interfaces/orden-trabajo.interface';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';
import { OtDiagnosticoHallazgosComponent } from '../ot-diagnostico-hallazgos/ot-diagnostico-hallazgos.component';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';

@Component({
  selector: 'app-ot-finalizada-step',
  imports: [CurrencyPipe, DatePipe, OtDiagnosticoHallazgosComponent, OtDetalleLineasComponent],
  template: `
    <div class="ot-fin-shell">
      <aside class="ot-fin-resumen">
        <h2 class="ot-fin-resumen__titulo">Resumen</h2>
        <div class="ot-fin-resumen__avatar" aria-hidden="true">
          <span class="material-icons">
            {{ orden().tipo_recepcion === 'EQUIPO' ? 'precision_manufacturing' : 'directions_car' }}
          </span>
        </div>

        <div class="ot-fin-resumen__datos">
          <div class="ot-fin-resumen__campo">
            <span>Número</span>
            <strong>{{ orden().numero_orden || '—' }}</strong>
          </div>
          <div class="ot-fin-resumen__campo">
            <span>Cliente</span>
            <strong>{{ nombreCliente() }}</strong>
          </div>
          <div class="ot-fin-resumen__campo">
            <span>{{ orden().tipo_recepcion === 'EQUIPO' ? 'Equipo' : 'Vehículo' }}</span>
            <strong>{{ unidad() }}</strong>
          </div>
          <div class="ot-fin-resumen__campo">
            <span>Finalizada</span>
            <strong>{{ orden().fecha_finalizacion | date: 'dd/MM/yyyy HH:mm' }}</strong>
          </div>
          <div class="ot-fin-resumen__campo">
            <span>Plazo estimado</span>
            <strong>{{ resumenPlazo() }}</strong>
          </div>
          <div class="ot-fin-resumen__campo">
            <span>Total</span>
            <strong class="ot-fin-resumen__total">
              {{ orden().diagnostico?.total_presupuesto | currency: 'PYG' : 'symbol-narrow' : '1.0-0' }}
            </strong>
          </div>
        </div>
      </aside>

      <div class="ot-fin-split ot-diag-shell">
        <app-ot-diagnostico-hallazgos [orden]="orden()" [editable]="false" />
        <app-ot-detalle-lineas
          [orden]="orden()"
          [editable]="false"
          [diagnosticoLook]="true"
        />
      </div>
    </div>
  `,
  styleUrl: './ot-finalizada-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtFinalizadaStepComponent {
  readonly orden = input.required<OrdenTrabajoOutput>();

  protected nombreCliente(): string {
    return nombreCompletoPersona(this.orden().cliente?.persona) || '—';
  }

  protected unidad(): string {
    return unidadOrden(this.orden()) || '—';
  }

  protected resumenPlazo(): string {
    const d = this.orden().diagnostico;
    if (!d) return '—';
    const partes: string[] = [];
    if (d.fecha_inicio_estimada) {
      partes.push(d.fecha_inicio_estimada.split('T')[0]);
    }
    if (d.fecha_fin_estimada) {
      partes.push(d.fecha_fin_estimada.split('T')[0]);
    }
    if (d.duracion_estimada_dias && d.duracion_estimada_dias > 0) {
      const n = d.duracion_estimada_dias;
      partes.push(`${n} ${n === 1 ? 'día' : 'días'}`);
    }
    return partes.length ? partes.join(' · ') : '—';
  }
}
