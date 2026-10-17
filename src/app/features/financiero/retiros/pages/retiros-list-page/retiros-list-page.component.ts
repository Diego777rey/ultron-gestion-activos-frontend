import { DatePipe, DecimalPipe } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { DateRangePickerComponent } from '../../../../../shared/components/date-range-picker/date-range-picker';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { DateRangeValue, dateRangeLastDays, toIsoDate } from '../../../../../shared/models/date-range.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { CajaOutput } from '../../../cajas/interfaces/caja.interface';
import { SeleccionarCajaDialogComponent } from '../../../ultimas/dialogs/seleccionar-caja-dialog/seleccionar-caja-dialog.component';
import { RetiroCajaOutput } from '../../../../ventas/punto-de-venta/interfaces/sesion-caja.interface';
import { RetiroCajaService } from '../../../../ventas/punto-de-venta/services/retiro-caja.service';
import { formatoMoneda, simboloMoneda } from '../../../../ventas/punto-de-venta/models/monedas';
import { SectorService } from '../../../../sectores/services/sector.service';
import { SectorOutput } from '../../../../sectores/interfaces/sector.interface';

@Component({
  selector: 'app-retiros-list-page',
  imports: [
    DatePipe,
    DecimalPipe,
    GenericListComponent,
    TableCellDirective,
    DateRangePickerComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './retiros-list-page.component.html',
  styleUrl: './retiros-list-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class RetirosListPageComponent {
  private readonly retiroCajaService = inject(RetiroCajaService);
  private readonly sectorService = inject(SectorService);
  private readonly dialogService = inject(AppDialogService);

  protected readonly retiros = signal<RetiroCajaOutput[]>([]);
  protected readonly sectores = signal<SectorOutput[]>([]);
  protected readonly cajaSeleccionada = signal<CajaOutput | null>(null);
  protected readonly idSector = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly dateRange = signal<DateRangeValue>(dateRangeLastDays(7));
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);

  protected readonly columns: TableColumn<RetiroCajaOutput>[] = [
    { key: 'monto', header: 'Monto', width: '140px', align: 'right' },
    { key: 'fecha', header: 'Fecha', width: '150px', align: 'center' },
    { key: 'caja', header: 'Caja', width: '180px' },
    { key: 'sector', header: 'Sector', width: '180px' },
    { key: 'observacion', header: 'Observación', width: '1fr' },
    { key: 'responsable', header: 'Responsable', width: '200px' },
    { key: 'registradoPor', header: 'Registró', width: '160px' },
  ];

  protected readonly toolbarActions = computed<ListToolbarAction[]>(() => [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    {
      id: 'caja',
      label: this.cajaSeleccionada() ? 'Quitar caja' : 'Filtrar caja',
    },
  ]);

  constructor() {
    afterNextRender(() => {
      this.sectorService.findAll().subscribe({
        next: (sectores) => this.sectores.set(sectores ?? []),
      });
      this.load();
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const range = this.dateRange();
    const sectorRaw = this.idSector();
    this.retiroCajaService
      .listarPaginado(this.pageIndex(), this.pageSize(), this.search(), {
        idCaja: this.cajaSeleccionada()?.id_caja ?? null,
        idSector: sectorRaw ? Number(sectorRaw) : null,
        fechaDesde: toIsoDate(range.start),
        fechaHasta: toIsoDate(range.end),
      })
      .subscribe({
        next: (response) => {
          this.retiros.set(response.content ?? []);
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
        this.clearFilters();
        break;
      case 'caja':
        if (this.cajaSeleccionada()) {
          this.cajaSeleccionada.set(null);
          this.pageIndex.set(0);
          this.load();
        } else {
          this.openSelectCaja();
        }
        break;
    }
  }

  protected onSectorChange(value: string): void {
    this.idSector.set(value);
    this.pageIndex.set(0);
    this.load();
  }

  protected onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    if (range.start && range.end) {
      this.pageIndex.set(0);
      this.load();
    }
  }

  protected openSelectCaja(): void {
    this.dialogService
      .openForm<CajaOutput>(SeleccionarCajaDialogComponent, {
        title: 'Filtrar por caja',
        maxWidth: '560px',
      })
      .subscribe((caja) => {
        if (!caja) {
          return;
        }
        this.cajaSeleccionada.set(caja);
        this.pageIndex.set(0);
        this.load();
      });
  }

  protected simbolo(moneda: string | null | undefined): string {
    return simboloMoneda(moneda);
  }

  protected formato(moneda: string | null | undefined): string {
    return formatoMoneda(moneda);
  }

  protected responsableLabel(retiro: RetiroCajaOutput): string {
    return (retiro.responsableNombre || retiro.responsableUsuario || '').trim();
  }

  protected trackById = (r: RetiroCajaOutput): unknown => r.id_retiro_caja;

  private clearFilters(): void {
    this.search.set('');
    this.idSector.set('');
    this.cajaSeleccionada.set(null);
    this.dateRange.set(dateRangeLastDays(7));
    this.pageIndex.set(0);
    this.load();
  }
}
