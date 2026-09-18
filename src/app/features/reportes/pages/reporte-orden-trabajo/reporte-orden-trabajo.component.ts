import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericListComponent } from '../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../shared/components/action-menu/action-menu';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { DefaultEmptyPipe } from '../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../shared/models/list-toolbar-action.model';
import { PageChange, PageResponse } from '../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../shared/services/app-dialog.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { OrdenTrabajoService } from '../../../taller/orden-de-trabajo/services/orden-trabajo.service';
import {
  OrdenTrabajoDetalleOutput,
  OrdenTrabajoOutput,
} from '../../../taller/orden-de-trabajo/interfaces/orden-trabajo.interface';
import { ReporteService } from '../../../../shared/services/reporte.service';
import { ReporteOtPreviewComponent } from '../../dialogs/reporte-ot-preview.component';
import {
  etapaInfoOt,
  formatClienteOt,
  formatFechaOt,
  formatMonedaOt,
  formatPersonaOt,
  formatVehiculoOt,
  nombreLineaOt,
} from '../../reporte-ot.utils';

@Component({
  selector: 'app-reporte-orden-trabajo',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    UiButtonComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './reporte-orden-trabajo.component.html',
  styleUrl: './reporte-orden-trabajo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ReporteOrdenTrabajoComponent {
  private readonly ordenService = inject(OrdenTrabajoService);
  private readonly reporteService = inject(ReporteService);
  private readonly dialogs = inject(AppDialogService);
  private readonly notifications = inject(NotificationService);

  protected readonly ordenes = signal<OrdenTrabajoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<OrdenTrabajoOutput>[] = [
    { key: 'numero_orden', header: 'Nº Orden', width: '120px', align: 'center' },
    { key: 'etapa', header: 'Etapa', width: '140px', align: 'center' },
    { key: 'cliente', header: 'Cliente', width: '220px' },
    { key: 'vehiculo', header: 'Vehículo', width: '200px' },
    { key: 'fecha_creacion', header: 'Fecha', width: '120px', align: 'center' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'preview', label: 'Vista previa', icon: 'visibility', variant: 'outline' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'preview', label: 'Vista previa', icon: 'visibility' },
    { id: 'generar', label: 'Descargar PDF', icon: 'picture_as_pdf' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.ordenService.findPaginated(this.pageIndex(), this.pageSize(), this.search()).subscribe({
      next: (response: PageResponse<OrdenTrabajoOutput>) => {
        this.ordenes.set(response.content);
        this.totalElements.set(response.pageInfo.totalElements);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.load();
  }

  protected onToolbarAction(actionId: string): void {
    switch (actionId) {
      case 'search':
        this.pageIndex.set(0);
        this.load();
        break;
      case 'clear':
        this.search.set('');
        this.pageIndex.set(0);
        this.load();
        break;
      case 'preview':
        this.abrirVistaPrevia(this.ordenes(), this.search(), null);
        break;
    }
  }

  protected onRowAction(actionId: string, orden: OrdenTrabajoOutput): void {
    if (actionId === 'preview') {
      this.abrirVistaPrevia([orden], this.search(), this.ordenId(orden));
      return;
    }
    if (actionId === 'generar') {
      this.generarDetalle(orden);
    }
  }

  protected abrirVistaPrevia(
    ordenes: OrdenTrabajoOutput[],
    filtro: string,
    id: number | null,
  ): void {
    if (!ordenes.length) {
      this.notifications.warning('No hay órdenes para previsualizar.');
      return;
    }
    const unica = ordenes.length === 1;
    this.dialogs.openForm(ReporteOtPreviewComponent, {
      title: unica
        ? `Vista previa · OT ${ordenes[0].numero_orden ?? ''}`.trim()
        : 'Vista previa de detalles',
      subtitle: unica
        ? 'Todos los datos de la orden, listos para descargar en PDF'
        : 'Detalle de las órdenes listadas. El PDF incluye las que coincidan con el filtro',
      maxWidth: '960px',
      inputs: { ordenes, filtro, id },
    });
  }

  protected generarDetalle(orden: OrdenTrabajoOutput): void {
    const id = this.ordenId(orden);
    if (this.generando() || id == null) {
      return;
    }
    this.generando.set(true);
    this.reporteService.generar('orden_trabajo_detalle', { id }).subscribe({
      next: () => this.generando.set(false),
      error: () => this.generando.set(false),
    });
  }

  protected ordenId(orden: OrdenTrabajoOutput): number | null {
    const id = orden.id_orden_trabajo != null ? Number(orden.id_orden_trabajo) : null;
    return id == null || Number.isNaN(id) ? null : id;
  }

  protected formatCliente = formatClienteOt;
  protected formatVehiculo = formatVehiculoOt;
  protected formatFecha = formatFechaOt;
  protected formatPersona = formatPersonaOt;
  protected formatMoneda = formatMonedaOt;
  protected nombreLinea = nombreLineaOt;
  protected getEtapaInfo = etapaInfoOt;

  protected trackById = (o: OrdenTrabajoOutput): unknown => o.id_orden_trabajo;
  protected trackDetalle = (detalle: OrdenTrabajoDetalleOutput): unknown => detalle.id_detalle;
}
