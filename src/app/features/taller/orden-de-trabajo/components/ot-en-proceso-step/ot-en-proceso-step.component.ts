import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { CajaOutput } from '../../../../financiero/cajas/interfaces/caja.interface';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';
import { OtSolicitudRepuestoComponent } from '../ot-solicitud-repuesto/ot-solicitud-repuesto.component';

@Component({
  selector: 'app-ot-en-proceso-step',
  imports: [EntitySearcherComponent, OtDetalleLineasComponent, OtSolicitudRepuestoComponent],
  template: `
    <p class="ot-hint">
      Ajusta productos/servicios, solicita repuestos y al finalizar envía la orden a una caja abierta.
    </p>

    <app-ot-detalle-lineas
      [orden]="orden()"
      [editable]="true"
      [allowCreateServicio]="true"
      (ordenChange)="ordenChange.emit($event)"
      (errorChange)="errorChange.emit($event)"
    />

    @if (orden().id_orden_trabajo) {
      <app-ot-solicitud-repuesto
        [idOrden]="orden().id_orden_trabajo!"
        [editable]="true"
        (errorChange)="errorChange.emit($event)"
      />
    }

    <section class="ot-section ot-section--narrow">
      <h3 class="ot-section-title">Enviar a caja</h3>
      <p class="ot-hint">Solo se listan cajas con sesión abierta.</p>
      <div class="ot-field">
        <label class="ot-field__label-static">Caja abierta*</label>
        <app-entity-searcher
          [items]="cajas()"
          [columns]="cajaColumns"
          [totalItems]="cajas().length"
          [loading]="loadingCajas()"
          [displayFn]="cajaLabelFn"
          [keyFn]="cajaKeyFn"
          [value]="selectedCajaId()"
          (searchChange)="filtrarCajas($event)"
          (itemChange)="onCajaSelected($event)"
          [backendPagination]="false"
          placeholder="Seleccionar caja abierta..."
        />
      </div>
    </section>
  `,
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtEnProcesoStepComponent implements OnInit {
  private readonly ordenService = inject(OrdenTrabajoService);

  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();
  readonly cajaSeleccionada = output<string | null>();

  protected readonly cajas = signal<CajaOutput[]>([]);
  protected readonly cajasAll = signal<CajaOutput[]>([]);
  protected readonly loadingCajas = signal(false);
  protected readonly selectedCajaId = signal<string | null>(null);

  protected readonly cajaColumns: TableColumn<CajaOutput>[] = [
    { key: 'nombre', header: 'Caja', value: (c) => c.nombre ?? '' },
    { key: 'sector', header: 'Sector', value: (c) => c.sector?.nombre ?? '' },
  ];
  protected readonly cajaLabelFn = (c: CajaOutput) =>
    `${c.nombre}${c.sector?.nombre ? ' · ' + c.sector.nombre : ''}`;
  protected readonly cajaKeyFn = (c: CajaOutput) => String(c.id_caja);

  ngOnInit(): void {
    this.cargarCajas();
  }

  getSelectedCajaId(): string | null {
    return this.selectedCajaId();
  }

  protected cargarCajas(): void {
    this.loadingCajas.set(true);
    this.ordenService.listarCajasConSesionAbierta().subscribe({
      next: (list) => {
        this.cajasAll.set(list);
        this.cajas.set(list);
        this.loadingCajas.set(false);
      },
      error: (err) => {
        this.errorChange.emit(err?.message ?? 'No se pudieron cargar las cajas abiertas');
        this.loadingCajas.set(false);
      },
    });
  }

  protected filtrarCajas(filter: string): void {
    const q = (filter || '').toLowerCase();
    if (!q) {
      this.cajas.set(this.cajasAll());
      return;
    }
    this.cajas.set(
      this.cajasAll().filter(
        (c) =>
          (c.nombre || '').toLowerCase().includes(q) ||
          (c.sector?.nombre || '').toLowerCase().includes(q)
      )
    );
  }

  protected onCajaSelected(caja: CajaOutput | null): void {
    const id = caja?.id_caja != null ? String(caja.id_caja) : null;
    this.selectedCajaId.set(id);
    this.cajaSeleccionada.emit(id);
  }
}
