import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GenericListComponent } from '../../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../../shared/components/action-menu/action-menu';
import { DateRangePickerComponent } from '../../../../../../shared/components/date-range-picker/date-range-picker';
import { EntitySearcherComponent } from '../../../../../../shared/components/entity-searcher/entity-searcher';
import { DefaultEmptyPipe } from '../../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../../shared/models/pagination.model';
import { DateRangeValue, dateRangeLastDays, toIsoDate } from '../../../../../../shared/models/date-range.model';
import { AppDialogService } from '../../../../../../shared/services/app-dialog.service';
import { LoadingService } from '../../../../../../shared/services/loading.service';
import { SectorOutput } from '../../../../../sectores/interfaces/sector.interface';
import { SectorService } from '../../../../../sectores/services/sector.service';
import { TransferenciaService } from '../../services/transferencia.service';
import { TransferenciaOutput } from '../../interfaces/transferencia.interface';
import { TransferenciaFormComponent } from '../../dialogs/transferencia-form/transferencia-form.component';
import { ReporteService } from '../../../../../../shared/services/reporte.service';
import { resolveLoadingErrorMessage } from '../../../../../../shared/utils/loading-error.util';

@Component({
  selector: 'app-transferencias-list',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DateRangePickerComponent,
    EntitySearcherComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './transferencias-list.component.html',
  styleUrl: './transferencias-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class TransferenciasListComponent {
  private readonly transferenciaService = inject(TransferenciaService);
  private readonly sectorService = inject(SectorService);
  private readonly dialogService = inject(AppDialogService);
  private readonly router = inject(Router);
  private readonly reporteService = inject(ReporteService);
  private readonly loadingService = inject(LoadingService);

  protected readonly transferencias = signal<TransferenciaOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly selectedOrigen = signal<SectorOutput | null>(null);
  protected readonly selectedDestino = signal<SectorOutput | null>(null);
  protected readonly dateRange = signal<DateRangeValue>(dateRangeLastDays(7));
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly sectores = signal<SectorOutput[]>([]);
  protected readonly sectoresTotal = signal(0);
  protected readonly sectoresPage = signal(0);
  protected readonly sectoresPageSize = signal(15);
  protected readonly sectoresFilter = signal('');
  protected readonly loadingSectores = signal(false);

  protected readonly sectoresForSearcher = computed(() => {
    const items = this.sectores();
    const extras = [this.selectedOrigen(), this.selectedDestino()].filter(
      (s): s is SectorOutput => s != null,
    );
    const missing = extras.filter((s) => !items.some((i) => i.id_sector === s.id_sector));
    return missing.length ? [...missing, ...items] : items;
  });

  protected readonly columns: TableColumn<TransferenciaOutput>[] = [
    { key: 'id', header: 'Id', width: '80px', align: 'center' },
    { key: 'numero', header: 'Número', width: '160px' },
    { key: 'fecha', header: 'Fecha', width: '140px' },
    { key: 'sectorOrigen', header: 'Sector origen', width: '180px' },
    { key: 'sectorDestino', header: 'Sector destino', width: '180px' },
    { key: 'cantidadItems', header: 'Ítems', width: '80px', align: 'center' },
    { key: 'estado', header: 'Estado', width: '140px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly sectorColumns: TableColumn<SectorOutput>[] = [
    { key: 'id_sector', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (s) => s.nombre ?? '' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'add', label: '+ Agregar' },
    { id: 'generar', label: 'Reporte' },
  ];

  constructor() {
    this.fetchSectoresPage(0, this.sectoresPageSize());
    this.load();
  }

  protected readonly sectorLabelFn = (s: SectorOutput) => s.nombre ?? `Sector #${s.id_sector}`;
  protected readonly sectorKeyFn = (s: SectorOutput) => s.id_sector;

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const range = this.dateRange();
    this.loadingService
      .pageLoad(
        this.transferenciaService.findPaginated(this.pageIndex(), this.pageSize(), this.search(), {
          idSectorOrigen: this.selectedOrigen()?.id_sector ?? null,
          idSectorDestino: this.selectedDestino()?.id_sector ?? null,
          fechaDesde: toIsoDate(range.start),
          fechaHasta: toIsoDate(range.end),
        }),
      )
      .subscribe({
        next: (response) => {
          this.transferencias.set(response.content);
          this.totalElements.set(response.pageInfo.totalElements);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.error.set(resolveLoadingErrorMessage(err));
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
        this.clearFilters();
        break;
      case 'add':
        this.openNewDialog();
        break;
      case 'generar':
        this.generarReporte();
        break;
    }
  }

  protected onOrigenSelected(sector: SectorOutput | null): void {
    this.selectedOrigen.set(sector);
    this.pageIndex.set(0);
    this.load();
  }

  protected onDestinoSelected(sector: SectorOutput | null): void {
    this.selectedDestino.set(sector);
    this.pageIndex.set(0);
    this.load();
  }

  protected onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    if ((range.start && range.end) || (!range.start && !range.end)) {
      this.pageIndex.set(0);
      this.load();
    }
  }

  protected fetchSectoresPage(page: number, size: number, filter = ''): void {
    this.loadingSectores.set(true);
    this.sectorService.findPaginated(page, size, filter).subscribe({
      next: (response) => {
        this.sectores.set(response.content);
        this.sectoresTotal.set(response.pageInfo.totalElements);
        this.sectoresPage.set(page);
        this.sectoresPageSize.set(size);
        this.sectoresFilter.set(filter);
        this.loadingSectores.set(false);
      },
      error: () => {
        this.loadingSectores.set(false);
      },
    });
  }

  protected onSectorSearchChange(filter: string): void {
    this.fetchSectoresPage(0, this.sectoresPageSize(), filter);
  }

  protected onSectorPageChange(event: PageChange): void {
    this.fetchSectoresPage(event.pageIndex, event.pageSize, this.sectoresFilter());
  }

  protected generarReporte(): void {
    if (this.generando()) {
      return;
    }
    this.generando.set(true);
    const filtro =
      this.search().trim() ||
      this.selectedOrigen()?.nombre ||
      this.selectedDestino()?.nombre ||
      '';
    this.reporteService.generarInventario('transferencia', { filtro }).subscribe({
      next: () => this.generando.set(false),
      error: () => this.generando.set(false),
    });
  }

  protected openNewDialog(): void {
    this.dialogService
      .openForm<TransferenciaOutput>(TransferenciaFormComponent, {
        title: 'Nueva transferencia',
        subtitle: 'Creá la cabecera; después cargás los productos en la gestión',
        maxWidth: '720px',
      })
      .subscribe((created) => {
        if (created?.id_transferencia) {
          void this.router.navigate([
            '/taller/operaciones/transferencia',
            created.id_transferencia,
          ]);
          return;
        }
        this.load();
      });
  }

  protected openGestion(item: TransferenciaOutput): void {
    void this.router.navigate(['/taller/operaciones/transferencia', item.id_transferencia]);
  }

  protected rowActionsFor(item: TransferenciaOutput): MenuAction[] {
    const actions: MenuAction[] = [
      { id: 'gestionar', label: 'Gestionar', icon: 'edit_note' },
    ];
    const estado = this.normalizarEstado(item.estado);
    if (estado !== 'RECEPCIONADO') {
      actions.push({ id: 'avanzar', label: 'Avanzar etapa', icon: 'trending_flat' });
    }
    return actions;
  }

  protected onRowAction(actionId: string, item: TransferenciaOutput): void {
    switch (actionId) {
      case 'gestionar':
        this.openGestion(item);
        break;
      case 'avanzar':
        this.transferenciaService.avanzarEtapa(item.id_transferencia).subscribe({
          next: () => this.load(),
          error: (err: Error) => this.error.set(err.message),
        });
        break;
    }
  }

  protected estadoLabel(estado?: string | null): string {
    switch (this.normalizarEstado(estado)) {
      case 'CREACION':
        return 'Creación';
      case 'PENDIENTE_CONFERIR':
        return 'Pendiente a conferir';
      case 'CONFERIDO':
        return 'Conferido';
      case 'RECEPCIONADO':
        return 'Recepcionado';
      default:
        return estado ?? '';
    }
  }

  private normalizarEstado(estado?: string | null): string {
    const n = (estado ?? '').toUpperCase();
    if (n === 'PENDIENTE') {
      return 'CREACION';
    }
    return n;
  }

  private clearFilters(): void {
    this.search.set('');
    this.selectedOrigen.set(null);
    this.selectedDestino.set(null);
    this.dateRange.set(dateRangeLastDays(7));
    this.pageIndex.set(0);
    this.load();
  }

  protected trackById = (t: TransferenciaOutput): unknown => t.id_transferencia;
}
