import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GenericListComponent } from '../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../shared/components/data-table/table-cell.directive';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button';
import { DateRangePickerComponent } from '../../../shared/components/date-range-picker/date-range-picker';
import { DefaultEmptyPipe } from '../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../shared/models/pagination.model';
import { DateRangeValue, dateRangeLastDays, toIsoDate } from '../../../shared/models/date-range.model';
import { SesionCajaOutput } from '../punto-de-venta/interfaces/sesion-caja.interface';
import { SesionCajaService } from '../punto-de-venta/services/sesion-caja.service';
import { TicketCierreCajaService } from '../punto-de-venta/services/ticket-cierre-caja.service';

const DIAS_POR_DEFECTO = 3;

/** Cierres de caja del cajero logueado, para reimprimir el ticket de cierre. */
@Component({
  selector: 'app-ultimas-cajas',
  imports: [
    DatePipe,
    DecimalPipe,
    GenericListComponent,
    TableCellDirective,
    UiButtonComponent,
    DateRangePickerComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './ultimas-cajas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class UltimasCajasComponent {
  private readonly sesionCajaService = inject(SesionCajaService);
  private readonly ticketCierreCaja = inject(TicketCierreCajaService);

  protected readonly sesiones = signal<SesionCajaOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);
  protected readonly imprimiendoId = signal<number | null>(null);
  protected readonly dateRange = signal<DateRangeValue>(dateRangeLastDays(DIAS_POR_DEFECTO));

  protected readonly columns: TableColumn<SesionCajaOutput>[] = [
    { key: 'id_sesion_caja', header: 'Id', width: '80px', align: 'center' },
    { key: 'caja', header: 'Caja', width: '200px' },
    { key: 'maletin', header: 'Maletín', width: '180px' },
    { key: 'fechaApertura', header: 'Fecha de apertura', width: '170px', align: 'center' },
    { key: 'fechaCierre', header: 'Fecha de cierre', width: '170px', align: 'center' },
    { key: 'totalVentasPyg', header: 'Total ventas', width: '150px', align: 'right' },
    { key: 'reimprimir', header: '', width: '180px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'refresh', label: 'Actualizar', icon: 'refresh' },
    { id: 'clear', label: 'Limpiar Filtro' },
  ];

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);
    const range = this.dateRange();
    this.sesionCajaService
      .misSesionesCerradas(this.pageIndex(), this.pageSize(), toIsoDate(range.start), toIsoDate(range.end))
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
    if (actionId === 'clear') {
      this.dateRange.set(dateRangeLastDays(DIAS_POR_DEFECTO));
    }
    if (actionId === 'refresh' || actionId === 'clear') {
      this.pageIndex.set(0);
      this.load();
    }
  }

  protected onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    if (range.start && range.end) {
      this.pageIndex.set(0);
      this.load();
    }
  }

  protected reimprimir(sesion: SesionCajaOutput): void {
    const id = sesion.id_sesion_caja;
    if (id == null || this.imprimiendoId() != null) {
      return;
    }
    this.imprimiendoId.set(id);
    this.ticketCierreCaja.imprimir(id).subscribe({
      complete: () => this.imprimiendoId.set(null),
      error: () => this.imprimiendoId.set(null),
    });
  }

  protected trackById = (s: SesionCajaOutput): unknown => s.id_sesion_caja;
}
