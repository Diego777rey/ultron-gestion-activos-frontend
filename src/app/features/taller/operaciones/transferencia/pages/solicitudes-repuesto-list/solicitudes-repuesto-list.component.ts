import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GenericListComponent } from '../../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../../shared/models/pagination.model';
import { ReporteService } from '../../../../../../shared/services/reporte.service';
import { NotificationService } from '../../../../../../shared/services/notification.service';
import { SolicitudRepuestoService } from '../../../../orden-de-trabajo/services/solicitud-repuesto.service';
import { SolicitudRepuestoOutput } from '../../../../orden-de-trabajo/interfaces/solicitud-repuesto.interface';

@Component({
  selector: 'app-solicitudes-repuesto-list',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './solicitudes-repuesto-list.component.html',
  styleUrl: './solicitudes-repuesto-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class SolicitudesRepuestoListComponent {
  private readonly solicitudService = inject(SolicitudRepuestoService);
  private readonly reporteService = inject(ReporteService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly solicitudes = signal<SolicitudRepuestoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<SolicitudRepuestoOutput>[] = [
    { key: 'fecha', header: 'Fecha', width: '150px' },
    { key: 'numero_orden', header: 'Orden de trabajo', width: '150px' },
    { key: 'sector_origen', header: 'Sector origen', width: '160px' },
    { key: 'sector_destino', header: 'Sector destino', width: '160px' },
    { key: 'productos', header: 'Productos', width: '230px' },
    { key: 'estado', header: 'Estado', width: '130px', align: 'center' },
    { key: 'transferencia', header: 'Transferencia', width: '150px' },
    { key: 'observacion', header: 'Observación', width: '180px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'generar', label: 'Reporte' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.solicitudService
      .findPaginated(this.pageIndex(), this.pageSize(), this.search())
      .subscribe({
        next: (response) => {
          this.solicitudes.set(response.content);
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
      case 'generar':
        this.generarReporte();
        break;
    }
  }

  protected generarReporte(): void {
    if (this.generando()) {
      return;
    }
    this.generando.set(true);
    this.reporteService
      .generarInventario('solicitud_repuesto', { filtro: this.search() })
      .subscribe({
        next: () => this.generando.set(false),
        error: () => this.generando.set(false),
      });
  }

  protected openOt(item: SolicitudRepuestoOutput): void {
    if (item.id_orden_trabajo) {
      void this.router.navigate(['/taller/orden-de-trabajo/detalle', item.id_orden_trabajo]);
    }
  }

  protected openTransferencia(item: SolicitudRepuestoOutput): void {
    if (item.id_transferencia) {
      void this.router.navigate(['/taller/operaciones/transferencia', item.id_transferencia]);
    }
  }

  protected rowActionsFor(item: SolicitudRepuestoOutput): MenuAction[] {
    const actions: MenuAction[] = [];
    if (item.estado === 'PENDIENTE') {
      actions.push({ id: 'aprobar', label: 'Aprobar solicitud', icon: 'check' });
      actions.push({ id: 'rechazar', label: 'Rechazar solicitud', icon: 'close' });
    }
    if (item.id_transferencia) {
      actions.push({ id: 'transferencia', label: 'Ver transferencia', icon: 'sync_alt' });
    }
    if (item.id_orden_trabajo) {
      actions.push({ id: 'ot', label: 'Ver orden de trabajo', icon: 'assignment' });
    }
    return actions;
  }

  protected onRowAction(actionId: string, item: SolicitudRepuestoOutput): void {
    switch (actionId) {
      case 'aprobar':
        this.aprobar(item);
        break;
      case 'rechazar':
        this.rechazar(item);
        break;
      case 'transferencia':
        this.openTransferencia(item);
        break;
      case 'ot':
        this.openOt(item);
        break;
    }
  }

  protected aprobar(item: SolicitudRepuestoOutput): void {
    if (!item.id_solicitud_repuesto) return;
    const confirmacion = confirm(
      `¿Aprobar solicitud de repuestos para la orden ${item.numero_orden ?? ''}? Al aprobar se generará la transferencia correspondiente.`
    );
    if (!confirmacion) return;

    this.solicitudService.aprobar(item.id_solicitud_repuesto).subscribe({
      next: () => {
        this.notificationService.success('Solicitud aprobada y transferencia creada');
        this.load();
      },
      error: (err: Error) => {
        this.notificationService.error(err?.message || 'No se pudo aprobar la solicitud');
      },
    });
  }

  protected rechazar(item: SolicitudRepuestoOutput): void {
    if (!item.id_solicitud_repuesto) return;
    const motivo = prompt('Motivo del rechazo de la solicitud:');
    if (!motivo?.trim()) return;

    this.solicitudService.rechazar(item.id_solicitud_repuesto, motivo.trim()).subscribe({
      next: () => {
        this.notificationService.info('Solicitud rechazada');
        this.load();
      },
      error: (err: Error) => {
        this.notificationService.error(err?.message || 'No se pudo rechazar la solicitud');
      },
    });
  }

  protected estadoLabel(estado?: string | null): string {
    switch ((estado ?? '').toUpperCase()) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'APROBADA':
        return 'Aprobada';
      case 'RECHAZADA':
        return 'Rechazada';
      default:
        return estado ?? '';
    }
  }

  protected trackById = (s: SolicitudRepuestoOutput): unknown => s.id_solicitud_repuesto;
}
