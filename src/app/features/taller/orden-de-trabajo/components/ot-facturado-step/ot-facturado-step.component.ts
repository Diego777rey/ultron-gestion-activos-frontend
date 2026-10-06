import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ETAPAS_ORDEN, OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';
import { nombreCompletoPersona } from '../../../../personas/shared/nombre-persona';

@Component({
  selector: 'app-ot-facturado-step',
  imports: [CurrencyPipe, DatePipe, OtDetalleLineasComponent],
  template: `
    <div class="ot-fac-shell">
      <aside class="ot-fac-resumen">
        <h2 class="ot-fac-resumen__titulo">Facturación</h2>
        <div class="ot-fac-resumen__avatar" aria-hidden="true">
          <span class="material-icons">receipt</span>
        </div>

        <div class="ot-fac-resumen__datos">
          <div class="ot-fac-resumen__campo">
            <span>Número</span>
            <strong>{{ orden().numero_orden || '—' }}</strong>
          </div>
          <div class="ot-fac-resumen__campo">
            <span>Cliente</span>
            <strong>{{ nombreCliente() }}</strong>
          </div>
          <div class="ot-fac-resumen__campo">
            <span>Estado</span>
            <strong>{{ etiquetaEtapa() }}</strong>
          </div>
          @if (orden().caja?.nombre) {
            <div class="ot-fac-resumen__campo">
              <span>Caja</span>
              <strong>{{ orden().caja?.nombre }}</strong>
            </div>
          }
          <div class="ot-fac-resumen__campo">
            <span>Finalización</span>
            <strong>{{ (orden().fecha_finalizacion | date: 'dd/MM/yyyy HH:mm') || '—' }}</strong>
          </div>
          <div class="ot-fac-resumen__campo">
            <span>Total cobrado</span>
            <strong class="ot-fac-resumen__total">
              {{ orden().diagnostico?.total_presupuesto | currency: 'PYG' : 'symbol-narrow' : '1.0-0' }}
            </strong>
          </div>
          @if (orden().observaciones_finalizacion) {
            <div class="ot-fac-resumen__campo">
              <span>Observaciones</span>
              <strong>{{ orden().observaciones_finalizacion }}</strong>
            </div>
          }
        </div>
      </aside>

      <div class="ot-fac-tabla ot-diag-shell">
        <app-ot-detalle-lineas
          [orden]="orden()"
          [editable]="false"
          [diagnosticoLook]="true"
          tituloLectura="Presupuesto detallado"
        />
      </div>
    </div>
  `,
  styleUrl: './ot-facturado-step.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtFacturadoStepComponent {
  readonly orden = input.required<OrdenTrabajoOutput>();

  protected nombreCliente(): string {
    return nombreCompletoPersona(this.orden().cliente?.persona) || '—';
  }

  protected etiquetaEtapa(): string {
    return ETAPAS_ORDEN.find((e) => e.valor === this.orden().etapa)?.label ?? this.orden().etapa ?? '—';
  }
}
