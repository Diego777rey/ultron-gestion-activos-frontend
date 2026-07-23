import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';

@Component({
  selector: 'app-ot-agenda-mecanico',
  imports: [DatePipe],
  template: `
    <section class="ot-panel" aria-label="Agenda del mecánico">
      <h3 class="ot-panel__title">
        <span class="material-icons" aria-hidden="true">event</span>
        Agenda del mecánico (próximos 14 días)
      </h3>

      @if (!idMecanico()) {
        <p class="ot-panel__empty">Selecciona un mecánico para ver su agenda.</p>
      } @else if (loading()) {
        <p class="ot-panel__empty">Cargando agenda...</p>
      } @else if (items().length === 0) {
        <p class="ot-panel__empty">Sin órdenes programadas en el período.</p>
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
                {{ (ot.fecha_inicio_estimada || ot.fecha_creacion) | date: 'dd/MM/yyyy' }}
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
export class OtAgendaMecanicoComponent {
  private readonly ordenService = inject(OrdenTrabajoService);

  readonly idMecanico = input<string | null>(null);

  protected readonly items = signal<OrdenTrabajoOutput[]>([]);
  protected readonly loading = signal(false);

  constructor() {
    effect(() => {
      const id = this.idMecanico();
      if (!id) {
        this.items.set([]);
        return;
      }
      this.cargar(id);
    });
  }

  private cargar(idMecanico: string): void {
    const hoy = new Date();
    const hasta = new Date();
    hasta.setDate(hoy.getDate() + 14);
    const desdeStr = hoy.toISOString().slice(0, 10);
    const hastaStr = hasta.toISOString().slice(0, 10);

    this.loading.set(true);
    this.ordenService.listarAgendaMecanico(idMecanico, desdeStr, hastaStr).subscribe({
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
