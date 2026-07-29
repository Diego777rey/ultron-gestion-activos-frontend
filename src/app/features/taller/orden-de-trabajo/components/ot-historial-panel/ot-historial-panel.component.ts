import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
import { PaginatorComponent } from '../../../../../shared/components/paginator/paginator';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { PageChange, PageResponse } from '../../../../../shared/models/pagination.model';

@Component({
  selector: 'app-ot-historial-panel',
  imports: [CurrencyPipe, DatePipe, PaginatorComponent, UiButtonComponent],
  template: `
    <section class="ot-panel ot-panel--historial" aria-label="Historial de órdenes">
      <h3 class="ot-panel__title">
        <span class="material-icons" aria-hidden="true">history</span>
        Historial de órdenes
      </h3>

      <div class="ot-panel__body">
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
                <div class="ot-panel__item-main">
                  <span>
                    <strong>{{ ot.numero_orden }}</strong>
                    · {{ ot.etapa }}
                    @if (ot.vehiculo?.chapa) {
                      · {{ ot.vehiculo?.chapa }}
                    }
                  </span>
                  <span class="ot-panel__item-meta">
                    {{ ot.fecha_creacion | date: 'dd/MM/yyyy' }}
                    · {{ ot.total_presupuesto | currency: 'PYG' : 'symbol-narrow' : '1.0-0' }}
                  </span>
                </div>
                <app-ui-button
                  icon="arrow_forward"
                  [iconOnly]="true"
                  variant="ghost"
                  size="sm"
                  [ariaLabel]="'Ver orden ' + ot.numero_orden"
                  (clicked)="abrirOrden(ot)"
                />
              </li>
            }
          </ul>
        }
      </div>

      @if (totalElements() > 0) {
        <div class="ot-panel__paginator">
          <app-paginator
            [total]="totalElements()"
            [pageIndex]="pageIndex()"
            [pageSize]="pageSize()"
            [pageSizeOptions]="[5, 10, 15]"
            (pageChange)="onPageChange($event)"
          />
        </div>
      }
    </section>
  `,
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtHistorialPanelComponent {
  private readonly ordenService = inject(OrdenTrabajoService);
  private readonly router = inject(Router);

  readonly idCliente = input<string | null>(null);
  readonly idVehiculo = input<string | null>(null);

  protected readonly items = signal<OrdenTrabajoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(5);
  protected readonly totalElements = signal(0);

  constructor() {
    effect(() => {
      const idCliente = this.idCliente();
      const idVehiculo = this.idVehiculo();
      const size = untracked(() => this.pageSize());
      this.pageIndex.set(0);
      this.cargar(idCliente, idVehiculo, 0, size);
    });
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.cargar(this.idCliente(), this.idVehiculo(), event.pageIndex, event.pageSize);
  }

  protected abrirOrden(ot: OrdenTrabajoOutput): void {
    if (!ot.id_orden_trabajo) return;
    this.router.navigate(['/taller/orden-de-trabajo/detalle', ot.id_orden_trabajo]);
  }

  private cargar(
    idCliente: string | null,
    idVehiculo: string | null,
    page: number,
    size: number
  ): void {
    if (idVehiculo) {
      this.loading.set(true);
      this.ordenService.findByVehiculo(idVehiculo, page, size).subscribe({
        next: (response) => this.applyResponse(response),
        error: () => this.applyEmpty(),
      });
      return;
    }

    if (idCliente) {
      this.loading.set(true);
      this.ordenService.findByCliente(idCliente, page, size).subscribe({
        next: (response) => this.applyResponse(response),
        error: () => this.applyEmpty(),
      });
      return;
    }

    this.applyEmpty();
  }

  private applyResponse(response: PageResponse<OrdenTrabajoOutput>): void {
    this.items.set(response.content ?? []);
    this.totalElements.set(response.pageInfo?.totalElements ?? 0);
    this.loading.set(false);
  }

  private applyEmpty(): void {
    this.items.set([]);
    this.totalElements.set(0);
    this.loading.set(false);
  }
}
