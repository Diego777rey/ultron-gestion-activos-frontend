import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { UiButtonComponent } from '../../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../../shared/components/entity-searcher/entity-searcher';
import { GenericListComponent } from '../../../../../../shared/components/generic-list/generic-list';
import { TableCellDirective } from '../../../../../../shared/components/data-table/table-cell.directive';
import { ActionMenuComponent, MenuAction } from '../../../../../../shared/components/action-menu/action-menu';
import { DefaultEmptyPipe } from '../../../../../../shared/pipes/default-empty.pipe';
import { TableColumn } from '../../../../../../shared/models/table-column.model';
import { PageChange } from '../../../../../../shared/models/pagination.model';
import { TransferenciaService } from '../../services/transferencia.service';
import {
  StockProductoSectorOutput,
  TransferenciaDetalleOutput,
  TransferenciaOutput,
} from '../../interfaces/transferencia.interface';

@Component({
  selector: 'app-transferencia-gestion',
  imports: [
    DecimalPipe,
    UiButtonComponent,
    EntitySearcherComponent,
    GenericListComponent,
    TableCellDirective,
    ActionMenuComponent,
    DefaultEmptyPipe,
  ],
  templateUrl: './transferencia-gestion.component.html',
  styleUrl: './transferencia-gestion.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view transferencia-gestion' },
})
export class TransferenciaGestionComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly transferenciaService = inject(TransferenciaService);

  protected readonly transferencia = signal<TransferenciaOutput | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cantidadNueva = signal(1);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);

  protected readonly stockItems = signal<StockProductoSectorOutput[]>([]);
  protected readonly stockTotal = signal(0);
  protected readonly stockPage = signal(0);
  protected readonly stockPageSize = signal(15);
  protected readonly stockFilter = signal('');
  protected readonly loadingStock = signal(false);

  protected readonly productoColumns: TableColumn<StockProductoSectorOutput>[] = [
    { key: 'codigo', header: 'Código', value: (s) => s.producto?.codigo ?? '' },
    { key: 'nombre', header: 'Producto', value: (s) => s.producto?.nombre ?? '' },
    { key: 'cantidad', header: 'Stock', value: (s) => String(s.cantidad ?? 0) },
  ];

  protected readonly columns: TableColumn<TransferenciaDetalleOutput>[] = [
    { key: 'producto', header: 'Producto' },
    { key: 'codigo', header: 'Código', width: '140px' },
    { key: 'cantidad', header: 'Cantidad', width: '120px', align: 'right' },
    { key: 'estado', header: 'Estado', width: '180px' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly esPendiente = computed(() => this.transferencia()?.estado === 'PENDIENTE');
  protected readonly esConferido = computed(() => this.transferencia()?.estado === 'CONFERIDO');
  protected readonly puedeConferir = computed(
    () => this.esPendiente() && (this.transferencia()?.detalles?.length ?? 0) > 0
  );

  protected readonly detalles = computed(() => this.transferencia()?.detalles ?? []);

  protected readonly detallesPagina = computed(() => {
    const start = this.pageIndex() * this.pageSize();
    return this.detalles().slice(start, start + this.pageSize());
  });

  protected readonly totalDetalles = computed(() => this.detalles().length);

  protected readonly stockLabelFn = (s: StockProductoSectorOutput) =>
    `${s.producto?.codigo ?? ''} — ${s.producto?.nombre ?? ''} (disp. ${s.cantidad ?? 0})`;
  protected readonly stockKeyFn = (s: StockProductoSectorOutput) => s.producto?.id_producto;

  constructor() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.error.set('Transferencia inválida');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  protected load(id?: number): void {
    const transferId = id ?? this.transferencia()?.id_transferencia;
    if (transferId == null) {
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.transferenciaService.findById(transferId).subscribe({
      next: (t) => {
        if (!t) {
          this.error.set('Transferencia no encontrada');
          this.transferencia.set(null);
          this.loading.set(false);
          return;
        }
        this.transferencia.set(t);
        this.loading.set(false);
        if (t.estado === 'PENDIENTE' && t.sectorOrigen?.id_sector != null) {
          this.fetchStockPage(0, this.stockPageSize());
        }
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo cargar la transferencia');
        this.loading.set(false);
      },
    });
  }

  protected fetchStockPage(page: number, size: number, filter = ''): void {
    const idSector = this.transferencia()?.sectorOrigen?.id_sector;
    if (idSector == null) {
      return;
    }
    this.loadingStock.set(true);
    this.transferenciaService.listarStockPorSector(idSector, page, size, filter).subscribe({
      next: (response) => {
        this.stockItems.set(response.content);
        this.stockTotal.set(response.pageInfo.totalElements);
        this.stockPage.set(page);
        this.stockPageSize.set(size);
        this.stockFilter.set(filter);
        this.loadingStock.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el stock del sector origen');
        this.loadingStock.set(false);
      },
    });
  }

  protected onStockSearchChange(filter: string): void {
    this.fetchStockPage(0, this.stockPageSize(), filter);
  }

  protected onStockPageChange(event: PageChange): void {
    this.fetchStockPage(event.pageIndex, event.pageSize, this.stockFilter());
  }

  protected onCantidadNuevaInput(raw: string): void {
    const n = Number(raw);
    this.cantidadNueva.set(Number.isFinite(n) && n > 0 ? n : 1);
  }

  protected onProductoSelected(stock: StockProductoSectorOutput | null): void {
    const t = this.transferencia();
    if (!t || !this.esPendiente() || !stock?.producto?.id_producto) {
      return;
    }
    const idProducto = stock.producto.id_producto;
    if ((t.detalles ?? []).some((d) => d.producto?.id_producto === idProducto)) {
      this.error.set('El producto ya está en la transferencia');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.transferenciaService
      .agregarProducto(t.id_transferencia, {
        idProducto,
        cantidad: Math.max(1, this.cantidadNueva()),
      })
      .subscribe({
        next: (updated) => {
          this.transferencia.set(updated);
          this.cantidadNueva.set(1);
          this.saving.set(false);
          this.fetchStockPage(this.stockPage(), this.stockPageSize(), this.stockFilter());
        },
        error: (err: Error) => {
          this.error.set(err.message || 'No se pudo agregar el producto');
          this.saving.set(false);
        },
      });
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected rowActionsFor(detalle: TransferenciaDetalleOutput): MenuAction[] {
    if (!this.esPendiente()) {
      return [];
    }
    return [{ id: 'remove', label: 'Quitar', icon: 'delete' }];
  }

  protected onRowAction(actionId: string, detalle: TransferenciaDetalleOutput): void {
    const t = this.transferencia();
    if (!t || actionId !== 'remove' || detalle.id_detalle == null) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.transferenciaService.eliminarProducto(t.id_transferencia, detalle.id_detalle).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.saving.set(false);
        this.fetchStockPage(this.stockPage(), this.stockPageSize(), this.stockFilter());
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo quitar el producto');
        this.saving.set(false);
      },
    });
  }

  protected conferir(): void {
    const t = this.transferencia();
    if (!t || !this.puedeConferir()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.transferenciaService.conferir(t.id_transferencia).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.saving.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo conferir');
        this.saving.set(false);
      },
    });
  }

  protected recepcionar(): void {
    const t = this.transferencia();
    if (!t || !this.esConferido()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.transferenciaService.recepcionar(t.id_transferencia).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.saving.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo recepcionar');
        this.saving.set(false);
      },
    });
  }

  protected personaLabel(t: TransferenciaOutput): string {
    const p = t.persona;
    if (!p) {
      return '—';
    }
    return [p.nombre, p.apellido].filter(Boolean).join(' ') || '—';
  }

  protected estadoDetalle(estado?: string | null): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente de conferir';
      case 'CONFERIDO':
        return 'Conferido';
      case 'RECEPCIONADO':
        return 'Recepcionado';
      default:
        return estado ?? '—';
    }
  }

  protected trackById = (d: TransferenciaDetalleOutput): unknown => d.id_detalle;
}
