import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
  OnInit,
} from '@angular/core';
import { OrdenTrabajoOutput } from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';
import { OtDetalleLineasComponent } from '../ot-detalle-lineas/ot-detalle-lineas.component';
import { OtDiagnosticoHallazgosComponent } from '../ot-diagnostico-hallazgos/ot-diagnostico-hallazgos.component';
import { OtSolicitudRepuestoComponent } from '../ot-solicitud-repuesto/ot-solicitud-repuesto.component';
import { SectorService } from '../../../../sectores/services/sector.service';
import { SectorOutput } from '../../../../sectores/interfaces/sector.interface';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { TableColumn } from '../../../../../shared/models/table-column.model';

@Component({
  selector: 'app-ot-en-proceso-step',
  imports: [
    OtDetalleLineasComponent,
    OtSolicitudRepuestoComponent,
    OtDiagnosticoHallazgosComponent,
    EntitySearcherComponent,
    UiButtonComponent,
  ],
  template: `
    <div class="ot-en-proceso">

      @if (editable() && !orden().sector?.id_sector) {
        <div class="ot-sector-warn">
          <span class="material-icons ot-sector-warn__icon">warning_amber</span>
          <div class="ot-sector-warn__body">
            <strong>Esta orden no tiene un sector destino asignado.</strong>
            <p>Seleccioná el sector de reparaciones para poder crear solicitudes de repuesto.</p>
            <div class="ot-sector-warn__row">
              <div style="flex:1; min-width: 220px;">
                <app-entity-searcher
                  [items]="sectores()"
                  [columns]="sectorColumns"
                  [totalItems]="sectoresTotal()"
                  [loading]="loadingSectores()"
                  [displayFn]="sectorLabelFn"
                  [keyFn]="sectorKeyFn"
                  (searchChange)="fetchSectores(0, 10, $event)"
                  (pageChange)="fetchSectores($event.pageIndex, $event.pageSize, '')"
                  (itemChange)="onSectorSelected($event)"
                  [backendPagination]="true"
                  placeholder="Buscar sector destino..."
                />
              </div>
              <app-ui-button
                label="Asignar sector"
                icon="save"
                variant="primary"
                [loading]="savingSector()"
                [disabled]="!sectorSeleccionado()"
                (clicked)="asignarSector()"
              />
            </div>
          </div>
        </div>
      }

      @if (orden().id_orden_trabajo) {
        <app-ot-solicitud-repuesto
          [idOrden]="orden().id_orden_trabajo!"
          [sectorDestinoInicial]="orden().sector ?? null"
          [editable]="editable()"
          (errorChange)="errorChange.emit($event)"
          (solicitudCreada)="recargarOrden()"
        />
      }

      <app-ot-diagnostico-hallazgos
        [orden]="orden()"
        [editable]="editable()"
        [modoEnProceso]="true"
        (ordenChange)="ordenChange.emit($event)"
        (errorChange)="errorChange.emit($event)"
      />

      <app-ot-detalle-lineas
        [orden]="orden()"
        [editable]="editable()"
        [allowCreateServicio]="editable()"
        [modoEnProceso]="true"
        (ordenChange)="ordenChange.emit($event)"
        (errorChange)="errorChange.emit($event)"
      />
    </div>
  `,
  styleUrls: ['../../styles/ot-form.scss', './ot-en-proceso-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtEnProcesoStepComponent implements OnInit {
  private readonly ordenService = inject(OrdenTrabajoService);
  private readonly sectorService = inject(SectorService);

  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly editable = input(true);
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected readonly sectores = signal<SectorOutput[]>([]);
  protected readonly sectoresTotal = signal(0);
  protected readonly loadingSectores = signal(false);
  protected readonly savingSector = signal(false);
  protected readonly sectorSeleccionado = signal<SectorOutput | null>(null);

  protected readonly sectorColumns: TableColumn<SectorOutput>[] = [
    { key: 'nombre', header: 'Sector', value: (s) => s.nombre ?? '' },
  ];
  protected readonly sectorLabelFn = (s: SectorOutput) => s.nombre ?? '';
  protected readonly sectorKeyFn = (s: SectorOutput) => String(s.id_sector);

  ngOnInit(): void {
    if (this.editable() && !this.orden().sector?.id_sector) {
      this.fetchSectores(0, 10, '');
    }
  }

  protected fetchSectores(page: number, size: number, filter: string): void {
    this.loadingSectores.set(true);
    this.sectorService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.sectores.set(res.content);
        this.sectoresTotal.set(res.pageInfo.totalElements);
        this.loadingSectores.set(false);
      },
      error: () => this.loadingSectores.set(false),
    });
  }

  protected onSectorSelected(sector: SectorOutput | null): void {
    this.sectorSeleccionado.set(sector);
  }

  protected asignarSector(): void {
    const sector = this.sectorSeleccionado();
    const id = this.orden().id_orden_trabajo;
    if (!sector || !id) return;

    this.savingSector.set(true);
    this.ordenService.update(id, { id_sector: String(sector.id_sector) }).subscribe({
      next: (updated) => {
        this.ordenChange.emit(updated);
        this.savingSector.set(false);
        this.sectorSeleccionado.set(null);
      },
      error: (err) => {
        this.errorChange.emit(err?.message ?? 'No se pudo asignar el sector');
        this.savingSector.set(false);
      },
    });
  }

  protected recargarOrden(): void {
    const id = this.orden().id_orden_trabajo;
    if (!id) return;
    this.ordenService.findById(id).subscribe({
      next: (updated) => {
        if (updated) this.ordenChange.emit(updated);
      },
      error: (err) => {
        this.errorChange.emit(err?.message ?? 'No se pudo actualizar el presupuesto');
      },
    });
  }
}
