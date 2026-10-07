import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
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

@Component({
  selector: 'app-facturas-list',
  imports: [
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
    DecimalPipe,
    DatePipe,
  ],
  templateUrl: './facturas-list.component.html',
  styleUrl: './facturas-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class FacturasListComponent {
  private readonly facturaService = inject(FacturaService);
  private readonly empresaService = inject(EmpresaService);

  protected readonly facturas = signal<FacturaOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);
  protected readonly totalElements = signal(0);
  protected readonly idEmpresa = signal<number | null>(null);

  protected readonly columns: TableColumn<FacturaOutput>[] = [
    { key: 'id_factura', header: 'Id', width: '80px', align: 'center' },
    { key: 'numero_factura', header: 'Número', width: '160px' },
    { key: 'fecha_emision', header: 'Fecha', width: '140px', align: 'center' },
    { key: 'cliente_nombre', header: 'Cliente', width: '280px' },
    { key: 'total', header: 'Total', width: '140px', align: 'right' },
    { key: 'forma_pago', header: 'Forma de Pago', width: '140px', align: 'center' },
    { key: 'estado', header: 'Estado', width: '120px', align: 'center' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly toolbarActions: ListToolbarAction[] = [
    { id: 'search', label: 'Buscar' },
    { id: 'clear', label: 'Limpiar Filtro' },
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

    const observable = this.search().trim() === ''
      ? this.facturaService.listarFacturasPorEmpresaYEstado(
          empresaId,
          'EMITIDA',
          this.pageIndex(),
          this.pageSize()
        )
      : this.facturaService.buscarFacturas(
          empresaId,
          this.search(),
          this.pageIndex(),
          this.pageSize()
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
    }
  }

  protected onRowAction(actionId: string, factura: FacturaOutput): void {
    if (actionId === 'view') {
      console.log('Ver detalles de factura:', factura);
    }
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
