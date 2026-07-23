import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';

@Component({
  selector: 'app-ot-historial-panel',
  imports: [CurrencyPipe, DatePipe],
  template: `
    <section class="ot-panel" aria-label="Historial de órdenes">
      <h3 class="ot-panel__title">
        <span class="material-icons" aria-hidden="true">history</span>
        Historial de órdenes
      </h3>

      @if (!idCliente() && !idVehiculo()) {
        <p class="ot-panel__empty">Selecciona un cliente o vehículo para ver el historial.</p>
      } @else if (loading()) {
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
                · {{ ot.total_presupuesto | currency: 'PYG' : 'symbol-narrow' : '1.0-0' }}
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
  private readonly ordenService = inject(OrdenTrabajoService);

  readonly idCliente = input<string | null>(null);
  readonly idVehiculo = input<string | null>(null);

  protected readonly items = signal<OrdenTrabajoOutput[]>([]);
  protected readonly loading = signal(false);

  constructor() {
    effect(() => {
      const idCliente = this.idCliente();
      const idVehiculo = this.idVehiculo();
      if (idVehiculo) {
        this.cargarPorVehiculo(idVehiculo);
      } else if (idCliente) {
        this.cargarPorCliente(idCliente);
      } else {
        this.items.set([]);
      }
    });
  }

  private cargarPorCliente(id: string): void {
    this.loading.set(true);
    this.ordenService.findByCliente(id, 0, 8).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }

  private cargarPorVehiculo(id: string): void {
    this.loading.set(true);
    this.ordenService.findByVehiculo(id, 0, 8).subscribe({
      next: (list) => {
        this.items.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.items.set([]);
        this.loading.set(false);
      },
    });
  }
}
