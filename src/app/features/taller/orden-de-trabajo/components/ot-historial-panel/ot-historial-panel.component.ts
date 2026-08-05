import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';

@Component({
  selector: 'app-ot-historial-panel',
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section class="ot-panel ot-panel--dialog" aria-label="Historial de órdenes">
      @if (loading()) {
        <p class="ot-panel__empty">Cargando historial...</p>
      } @else if (items().length === 0) {
        <p class="ot-panel__empty">Sin órdenes anteriores.</p>
      } @else {
        <ul class="ot-panel__list">
          @for (ot of items(); track ot.id_orden_trabajo) {
            <li class="ot-panel__item">
              <span>
                <strong>{{ ot.numero_orden }}</strong>
                · {{ ot.etapa }}
                @if (ot.vehiculo?.chapa) {
                  · {{ ot.vehiculo?.chapa }}
                }
              </span>
              <span>
                {{ ot.fecha_creacion | date: 'dd/MM/yyyy' }}
                · {{ ot.diagnostico?.total_presupuesto | currency: 'PYG' : 'symbol-narrow' : '1.0-0' }}
              </span>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtHistorialPanelComponent {
  readonly items = input<OrdenTrabajoOutput[]>([]);
  readonly loading = input<boolean>(false);
}
