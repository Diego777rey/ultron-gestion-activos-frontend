import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GenericListComponent } from '../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ListToolbarAction } from '../../../../../shared/models/list-toolbar-action.model';
import { PageChange } from '../../../../../shared/models/pagination.model';
import { FacturaService } from '../../services/factura.service';
import { FacturaOutput } from '../../interfaces/factura.interface';
import { EmpresaService } from '../../../../personas/empresas/services/empresa.service';
import { EmpresaOutput } from '../../../../personas/empresas/interfaces/empresa.interface';
import { ReporteService } from '../../../../../shared/services/reporte.service';
import { NotificationService } from '../../../../../shared/services/notification.service';
import { DateRangePickerComponent } from '../../../../../shared/components/date-range-picker/date-range-picker';
import { DateRangeValue, dateRangeLastDays, toIsoDate } from '../../../../../shared/models/date-range.model';

@Component({
  selector: 'app-facturas-list',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    DecimalPipe,
    DateRangePickerComponent,
  ],
  templateUrl: './facturas-list.component.html',
  styleUrl: './facturas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class FacturasListComponent {
  private static readonly DIAS_POR_DEFECTO = 3;

  private readonly facturaService = inject(FacturaService);
  private readonly empresaService = inject(EmpresaService);
  private readonly reporteService = inject(ReporteService);
  private readonly notifications = inject(NotificationService);

  protected readonly facturas = signal<FacturaOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly generando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly dateRange = signal<DateRangeValue>(
    dateRangeLastDays(FacturasListComponent.DIAS_POR_DEFECTO),
  );
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);
  protected readonly idEmpresa = signal<number | null>(null);

  protected readonly columns: TableColumn<FacturaOutput>[] = [
    { key: 'numero_factura', header: 'Número', width: '13%' },
    { key: 'fecha_emision', header: 'Fecha', width: '8%', align: 'center' },
    { key: 'cliente_nombre', header: 'Cliente', width: '18%' },
    { key: 'timbrado', header: 'Timbrado', width: '9%' },
    { key: 'total_iva_10', header: 'IVA 10%', width: '8%', align: 'right' },
    { key: 'total_iva_5', header: 'IVA 5%', width: '7%', align: 'right' },
    { key: 'total_exenta', header: 'Exenta', width: '7%', align: 'right' },
    { key: 'total', header: 'Total', width: '10%', align: 'right' },
    { key: 'forma_pago', header: 'Pago', width: '8%', align: 'center' },
    { key: 'estado', header: 'Estado', width: '8%', align: 'center' },
    { key: 'acciones', header: '...', width: '4%', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
    { id: 'reporte-pdf', label: 'Reporte PDF', icon: 'picture_as_pdf' },
    { id: 'reporte-excel', label: 'Reporte Excel', icon: 'table_view' },
  ];

  protected readonly rowActions: MenuAction[] = [
    { id: 'view', label: 'Ver Detalles', icon: 'visibility' },
  ];

  constructor() {
    this.cargarEmpresaYFacturas();
  }

  private cargarEmpresaYFacturas(): void {
    this.loading.set(true);
    this.error.set(null);
    
    this.empresaService.getEmpresas().subscribe({
      next: (empresas) => {
        const empresa = this.resolverEmpresa(empresas);
        if (!empresa?.id_empresa) {
          this.error.set('No hay una empresa registrada. Cargala en Datos de facturación.');
          this.loading.set(false);
          return;
        }
        this.idEmpresa.set(empresa.id_empresa);
        this.load();
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  private resolverEmpresa(empresas: EmpresaOutput[]): EmpresaOutput | null {
    if (!empresas || empresas.length === 0) {
      return null;
    }
    const activa = empresas.find((e) => e.activa !== false);
    return activa || empresas[0];
  }

  protected load(): void {
    const empresaId = this.idEmpresa();
    if (!empresaId) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const rango = this.dateRange();
    const fechaDesde = toIsoDate(rango.start);
    const fechaHasta = toIsoDate(rango.end);
    const observable = this.search().trim() === ''
      ? this.facturaService.listarFacturasPorEmpresaYEstado(
          empresaId,
          'EMITIDA',
          this.pageIndex(),
          this.pageSize(),
          fechaDesde,
          fechaHasta,
        )
      : this.facturaService.buscarFacturas(
          empresaId,
          this.search(),
          this.pageIndex(),
          this.pageSize(),
          fechaDesde,
          fechaHasta,
        );

    observable.subscribe({
      next: (response) => {
        this.facturas.set(response.content);
        this.totalElements.set(response.pageInfo.totalElements);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conectar con el servidor');
        this.loading.set(false);
      },
    });
  }

  protected onDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    if ((range.start && range.end) || (!range.start && !range.end)) {
      this.pageIndex.set(0);
      this.load();
    }
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
        this.dateRange.set(dateRangeLastDays(FacturasListComponent.DIAS_POR_DEFECTO));
        this.pageIndex.set(0);
        this.load();
        break;
      case 'reporte-pdf':
        this.generarReporte('pdf');
        break;
      case 'reporte-excel':
        this.generarReporte('excel');
        break;
    }
  }

  private generarReporte(formato: 'pdf' | 'excel'): void {
    if (this.generando()) {
      return;
    }
    const idEmpresa = this.idEmpresa();
    if (!idEmpresa) {
      this.notifications.error('No hay una empresa registrada para generar el reporte.');
      return;
    }
    this.generando.set(true);
    const rango = this.dateRange();
    const opciones = {
      filtro: this.search(),
      idEmpresa,
      titulo: 'Facturas legales',
      fechaDesde: toIsoDate(rango.start),
      fechaHasta: toIsoDate(rango.end),
    };
    const pedido = formato === 'pdf'
      ? this.reporteService.generarInventario('factura', opciones)
      : this.reporteService.descargarExcel('factura', opciones);
    pedido.subscribe({
      next: () => this.generando.set(false),
      error: () => this.generando.set(false),
    });
  }

  protected onRowAction(actionId: string, factura: FacturaOutput): void {
    if (actionId === 'view') {
      console.log('Ver detalles de factura:', factura);
    }
  }

  /** El backend ya manda `dd/MM/yyyy HH:mm:ss`. El pipe de fecha de Angular no lee ese formato. */
  protected fecha(valor: string | null | undefined): string {
    if (!valor) {
      return '';
    }
    return valor.slice(0, 10);
  }

  protected formatFormaPago(formaPago: string): string {
    const formasPago: Record<string, string> = {
      'EFECTIVO': 'Efectivo',
      'TARJETA': 'Tarjeta',
      'TRANSFERENCIA': 'Transferencia',
      'CHEQUE': 'Cheque',
      'CREDITO': 'Crédito',
    };
    return formasPago[formaPago] || formaPago;
  }

  protected trackById = (f: FacturaOutput): unknown => f.id_factura;
}
