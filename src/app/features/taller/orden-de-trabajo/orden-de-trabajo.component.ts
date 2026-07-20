import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GenericListComponent } from '../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../shared/components/data-table/table-cell.directive';
import {
  ActionMenuComponent,
  MenuAction,
} from '../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../shared/models/list-toolbar-action.model';
import { PageChange, PageResponse } from '../../../shared/models/pagination.model';
import { OrdenTrabajoService } from './services/orden-trabajo.service';
import {
  OrdenTrabajoOutput,
  ETAPAS_ORDEN,
} from './interfaces/orden-trabajo.interface';
import { Router } from '@angular/router';

@Component({
  selector: 'app-orden-de-trabajo',
  imports: [
    CommonModule,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './orden-de-trabajo.component.html',
  styleUrl: './orden-de-trabajo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class OrdenDeTrabajoComponent {
  private readonly ordenService = inject(OrdenTrabajoService);
  private readonly router = inject(Router);

  protected readonly ordenes = signal<OrdenTrabajoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');

  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<OrdenTrabajoOutput>[] = [
    { key: 'numero_orden', header: 'Nº Orden', width: '120px', align: 'center' },
    { key: 'etapa', header: 'Etapa', width: '140px', align: 'center' },
    { key: 'cliente', header: 'Cliente', width: '200px' },
    { key: 'vehiculo', header: 'Vehículo', width: '180px' },
    { key: 'mecanico', header: 'Mecánico', width: '160px' },
    { key: 'total_presupuesto', header: 'Presupuesto', width: '130px', align: 'right' },
    { key: 'fecha_creacion', header: 'Fecha', width: '120px', align: 'center' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Nueva Orden' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'view', label: 'Ver Detalle', icon: 'visibility' },
    { id: 'delete', label: 'Eliminar', icon: 'delete' },
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
      case 'add':
        this.crearNuevaOrden();
        break;
    }
  }

  protected crearNuevaOrden(): void {
    this.router.navigate(['/taller/orden-de-trabajo/nueva']);
  }

  protected onRowAction(actionId: string, orden: OrdenTrabajoOutput): void {
    switch (actionId) {
      case 'view':
        this.abrirDetalleOrden(orden);
        break;
      case 'delete':
        if (orden.id_orden_trabajo) {
          this.ordenService.remove(orden.id_orden_trabajo).subscribe({
            next: () => this.load(),
          });
        }
        break;
    }
  }

  private abrirDetalleOrden(orden: OrdenTrabajoOutput): void {
    if (orden.id_orden_trabajo) {
      this.router.navigate(['/taller/orden-de-trabajo/detalle', orden.id_orden_trabajo]);
    }
  }

  protected formatCliente(o: OrdenTrabajoOutput): string {
    const p = o.cliente?.persona;
    return p ? `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() : '—';
  }

  protected formatVehiculo(o: OrdenTrabajoOutput): string {
    const v = o.vehiculo;
    if (!v) return '—';
    const desc = `${v.marca ?? ''} ${v.modelo ?? ''}`.trim();
    return v.chapa ? `${desc} (${v.chapa})` : desc || '—';
  }

  protected formatMecanico(o: OrdenTrabajoOutput): string {
    const p = o.mecanico?.persona;
    return p ? `${p.nombre ?? ''} ${p.apellido ?? ''}`.trim() : '—';
  }

  protected formatFecha(fecha?: string | null): string {
    if (!fecha) return '—';
    try {
      return new Intl.DateTimeFormat('es-PY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(fecha));
    } catch {
      return fecha;
    }
  }

  protected getEtapaInfo(etapa?: string | null) {
    return ETAPAS_ORDEN.find((e: { valor: string }) => e.valor === etapa) ?? { label: etapa ?? '—', icono: 'help', color: '#9E9E9E' };
  }

  protected trackById = (o: OrdenTrabajoOutput): unknown => o.id_orden_trabajo;
}
