import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';

@Component({
  selector: 'app-ot-finalizada-step',
  imports: [CurrencyPipe, DatePipe, OtDetalleLineasComponent],
  template: `
    <p class="ot-hint">
      La orden fue enviada a caja. Cuando se cobre, márcala como facturada.
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
          <span>Caja asignada</span>
          <span>{{ orden().caja?.nombre || '—' }}</span>
        </li>
        <li class="ot-panel__item">
          <span>Finalizada</span>
          <span>{{ orden().fecha_finalizacion | date: 'dd/MM/yyyy HH:mm' }}</span>
        </li>
        <li class="ot-panel__item">
          <span>Total</span>
          <span class="ot-total">{{ orden().total_presupuesto | currency: 'PYG' : 'symbol-narrow' : '1.0-0' }}</span>
        </li>
      </ul>
    </section>

    <app-ot-detalle-lineas [orden]="orden()" [editable]="false" />
  `,
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtFinalizadaStepComponent {
  readonly orden = input.required<OrdenTrabajoOutput>();
}
