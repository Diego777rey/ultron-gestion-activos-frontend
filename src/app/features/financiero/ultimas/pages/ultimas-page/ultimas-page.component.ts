import { DatePipe } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { CajaOutput } from '../../../cajas/interfaces/caja.interface';
import { SesionCajaOutput } from '../../../../ventas/punto-de-venta/interfaces/sesion-caja.interface';
import { SesionCajaService } from '../../../../ventas/punto-de-venta/services/sesion-caja.service';
import { SeleccionarCajaDialogComponent } from '../../dialogs/seleccionar-caja-dialog/seleccionar-caja-dialog.component';
import { SesionVentasDialogComponent } from '../../dialogs/sesion-ventas-dialog/sesion-ventas-dialog.component';

@Component({
  selector: 'app-ultimas-page',
  imports: [
    DatePipe,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './ultimas-page.component.html',
  styleUrl: './ultimas-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class UltimasPageComponent {
  private readonly sesionCajaService = inject(SesionCajaService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly cajaSeleccionada = signal<CajaOutput | null>(null);
  protected readonly sesiones = signal<SesionCajaOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<SesionCajaOutput>[] = [
    { key: 'id_sesion_caja', header: 'Id', width: '80px' },
    { key: 'sector', header: 'Sector', width: '160px' },
    { key: 'maletin', header: 'Maletín', width: '140px' },
    { key: 'estado', header: 'Estado', width: '110px', align: 'center' },
    { key: 'fechaApertura', header: 'Fecha de apertura', width: '170px' },
    { key: 'fechaCierre', header: 'Fecha de cierre', width: '170px' },
    { key: 'responsable', header: 'Responsable' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions = computed<ListToolbarAction[]>(() => [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    {
      id: 'caja',
      label: this.cajaSeleccionada() ? 'Cambiar caja' : 'Seleccionar caja',
    },
  ]);

  protected readonly rowActions: MenuAction[] = [
    { id: 'ventas', label: 'Ver ventas', icon: 'point_of_sale' },
  ];

  protected readonly emptyMessage = computed(() =>
    this.cajaSeleccionada()
      ? 'No hay sesiones registradas para esta caja'
      : 'Seleccioná una caja para ver el historial de aperturas y cierres',
  );

  constructor() {
    afterNextRender(() => {
      if (!this.cajaSeleccionada()) {
        this.openSelectCaja();
      }
    });
  }

  protected load(): void {
    const caja = this.cajaSeleccionada();
    if (!caja?.id_caja) {
      this.sesiones.set([]);
      this.totalElements.set(0);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.sesionCajaService
      .findPaginated(this.pageIndex(), this.pageSize(), this.search(), caja.id_caja)
      .subscribe({
        next: (response) => {
          this.sesiones.set(response.content ?? []);
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
      case 'caja':
        this.openSelectCaja();
        break;
    }
  }

  protected openSelectCaja(): void {
    this.dialogService
      .openForm<CajaOutput>(SeleccionarCajaDialogComponent, {
        title: 'Seleccionar caja',
        maxWidth: '560px',
      })
      .subscribe((caja) => {
        if (!caja) {
          return;
        }
        this.cajaSeleccionada.set(caja);
        this.search.set('');
        this.pageIndex.set(0);
        this.load();
      });
  }

  protected onRowAction(actionId: string, sesion: SesionCajaOutput): void {
    if (actionId === 'ventas') {
      this.openVentas(sesion);
    }
  }

  protected openVentas(sesion: SesionCajaOutput): void {
    const cajaNombre = sesion.caja?.nombre || this.cajaSeleccionada()?.nombre || 'caja';
    this.dialogService.openForm(SesionVentasDialogComponent, {
      title: `Ventas de la caja`,
      subtitle: `${cajaNombre} · Sesión #${sesion.id_sesion_caja}`,
      maxWidth: '1180px',
      inputs: { sesion },
    });
  }

  protected personaLabel(sesion: SesionCajaOutput): string {
    if (!sesion.persona) {
      return '';
    }
    return `${sesion.persona.nombre ?? ''} ${sesion.persona.apellido ?? ''}`.trim();
  }

  protected estadoLabel(estado?: string | null): string {
    switch ((estado ?? '').toUpperCase()) {
      case 'ABIERTA':
        return 'Abierta';
      case 'CERRADA':
        return 'Cerrada';
      default:
        return estado ?? '';
    }
  }

  protected trackById = (s: SesionCajaOutput): unknown => s.id_sesion_caja;
}
