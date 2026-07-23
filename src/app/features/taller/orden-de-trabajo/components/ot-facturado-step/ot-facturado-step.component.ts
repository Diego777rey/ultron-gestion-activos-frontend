import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';

@Component({
  selector: 'app-ot-facturado-step',
  imports: [CurrencyPipe, DatePipe, OtDetalleLineasComponent],
  template: `
    <p class="ot-hint">Orden facturada. Solo lectura.</p>

    <section class="ot-section ot-section--narrow">
      <h3 class="ot-panel__title">
        <span class="material-icons" aria-hidden="true">receipt</span>
        Facturación
      </h3>
      <ul class="ot-panel__list">
        <li class="ot-panel__item">
          <span>Número</span><span><strong>{{ orden().numero_orden }}</strong></span>
        </li>
        <li class="ot-panel__item">
          <span>Estado</span><span>{{ orden().etapa }}</span>
        </li>
        <li class="ot-panel__item">
          <span>Caja</span><span>{{ orden().caja?.nombre || '—' }}</span>
        </li>
        <li class="ot-panel__item">
          <span>Total cobrado</span>
          <span class="ot-total">{{ orden().total_presupuesto | currency: 'PYG' : 'symbol-narrow' : '1.0-0' }}</span>
        </li>
        <li class="ot-panel__item">
          <span>Finalización</span>
          <span>{{ orden().fecha_finalizacion | date: 'dd/MM/yyyy HH:mm' }}</span>
        </li>
      </ul>
    </section>

    <app-ot-detalle-lineas [orden]="orden()" [editable]="false" />
  `,
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtFacturadoStepComponent {
  readonly orden = input.required<OrdenTrabajoOutput>();
}
