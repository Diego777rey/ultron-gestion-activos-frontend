import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';
import { OtDiagnosticoHallazgosComponent } from '../ot-diagnostico-hallazgos/ot-diagnostico-hallazgos.component';

@Component({
  selector: 'app-ot-finalizada-step',
  imports: [CurrencyPipe, DatePipe, OtDetalleLineasComponent, OtDiagnosticoHallazgosComponent],
  template: `
    <p class="ot-hint">
      El trabajo está finalizado y ya está disponible en una caja abierta.
      La orden pasa a Facturado al cobrarla en el punto de venta.
    </p>

    <section class="ot-section ot-section--narrow">
      <h3 class="ot-panel__title">
        <span class="material-icons" aria-hidden="true">info</span>
        Resumen
      </h3>
      <ul class="ot-panel__list">
        <li class="ot-panel__item">
          <span>Número</span><span><strong>{{ orden().numero_orden }}</strong></span>
        </li>
        <li class="ot-panel__item">
          <span>Cliente</span>
          <span>
            {{ orden().cliente?.persona?.nombre }} {{ orden().cliente?.persona?.apellido }}
          </span>
        </li>
        <li class="ot-panel__item">
          <span>Vehículo</span>
          <span>{{ orden().vehiculo?.chapa }} · {{ orden().vehiculo?.marca }} {{ orden().vehiculo?.modelo }}</span>
        </li>
        <li class="ot-panel__item">
          <span>Finalizada</span>
          <span>{{ orden().fecha_finalizacion | date: 'dd/MM/yyyy HH:mm' }}</span>
        </li>
        <li class="ot-panel__item">
          <span>Plazo estimado</span>
          <span>{{ resumenPlazo() }}</span>
        </li>
        <li class="ot-panel__item">
          <span>Total</span>
          <span class="ot-total">{{ orden().diagnostico?.total_presupuesto | currency: 'PYG' : 'symbol-narrow' : '1.0-0' }}</span>
        </li>
      </ul>
    </section>

    <app-ot-diagnostico-hallazgos [orden]="orden()" [editable]="false" />
    <app-ot-detalle-lineas [orden]="orden()" [editable]="false" />
  `,
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtFinalizadaStepComponent {
  readonly orden = input.required<OrdenTrabajoOutput>();

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
