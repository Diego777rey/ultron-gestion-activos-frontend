import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
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
import { AppDialogService } from '../../../../../../shared/services/app-dialog.service';
import { TransferenciaService } from '../../services/transferencia.service';
import {
  MotivoRechazoTransferencia,
  StockProductoSectorOutput,
  TransferenciaDetalleOutput,
  TransferenciaOutput,
} from '../../interfaces/transferencia.interface';
import {
  RechazoDetalleDialogComponent,
  RechazoDetalleResult,
} from '../../dialogs/rechazo-detalle-dialog/rechazo-detalle-dialog.component';
import { PresentacionProductoOutput } from '../../../../../inventario/productos/interfaces/producto.interface';

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
  private readonly dialogService = inject(AppDialogService);
  private readonly cantidadInput = viewChild<ElementRef<HTMLInputElement>>('cantidadInput');

  protected readonly transferencia = signal<TransferenciaOutput | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Producto elegido, pendiente de confirmar cantidad e ingresar a la transferencia. */
  protected readonly productoPendiente = signal<StockProductoSectorOutput | null>(null);
  protected readonly cantidadNueva = signal(1);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(15);

  /** Presentación seleccionada para el producto pendiente */
  protected readonly presentacionSeleccionada = signal<PresentacionProductoOutput | null>(null);

  protected readonly stockItems = signal<StockProductoSectorOutput[]>([]);
  protected readonly stockTotal = signal(0);
  protected readonly stockPage = signal(0);
  protected readonly stockPageSize = signal(15);
  protected readonly stockFilter = signal('');
  protected readonly loadingStock = signal(false);

  protected readonly puedeCargarCantidad = computed(() => !!this.productoPendiente()?.producto?.id_producto);

  protected readonly stockItemsForSearcher = computed(() => {
    const pending = this.productoPendiente();
    const items = this.stockItems();
    const id = pending?.producto?.id_producto;
    if (id == null) {
      return items;
    }
    if (items.some((i) => i.producto?.id_producto === id)) {
      return items;
    }
    return [pending!, ...items];
  });

  protected readonly productoPendienteKey = computed(
    () => this.productoPendiente()?.producto?.id_producto ?? null
  );

  /** Presentaciones disponibles del producto seleccionado */
  protected readonly presentacionesDisponibles = computed<PresentacionProductoOutput[]>(() => {
    const stock = this.productoPendiente();
    const presentaciones = stock?.producto?.presentaciones;
    return presentaciones?.filter((p) => p.estado !== false) ?? [];
  });

  protected readonly productoColumns: TableColumn<StockProductoSectorOutput>[] = [
    { key: 'codigo', header: 'Código', value: (s) => s.producto?.codigo ?? '' },
    { key: 'nombre', header: 'Producto', value: (s) => s.producto?.nombre ?? '' },
    { key: 'precioVenta', header: 'Precio Vta.', value: (s) => String(s.producto?.precioVenta ?? 0) },
    { key: 'cantidad', header: 'Stock', value: (s) => String(s.cantidad ?? 0) },
  ];

  protected readonly columns: TableColumn<TransferenciaDetalleOutput>[] = [
    { key: 'producto', header: 'Producto' },
    { key: 'codigo', header: 'Código' },
    { key: 'presentacion', header: 'Presentación' },
    { key: 'precioVenta', header: 'Precio Vta.', align: 'right' },
    { key: 'cantidad', header: 'Cant.', align: 'right' },
    { key: 'cantidadTotal', header: 'Cant. Total', align: 'right' },
    { key: 'estado', header: 'Estado' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];

  protected readonly etapas = [
    { key: 'CREACION', label: 'Creación' },
    { key: 'PENDIENTE_CONFERIR', label: 'Pendiente a conferir' },
    { key: 'CONFERIDO', label: 'Conferido' },
    { key: 'RECEPCIONADO', label: 'Recepcionado' },
  ] as const;

  protected readonly estadoCabecera = computed(() =>
    this.normalizarEstadoCabecera(this.transferencia()?.estado)
  );

  protected readonly esCreacion = computed(() => this.estadoCabecera() === 'CREACION');
  protected readonly esPendienteConferir = computed(
    () => this.estadoCabecera() === 'PENDIENTE_CONFERIR'
  );
  protected readonly esConferido = computed(() => this.estadoCabecera() === 'CONFERIDO');
  protected readonly esRecepcionado = computed(() => this.estadoCabecera() === 'RECEPCIONADO');

  protected readonly detalles = computed(() => this.transferencia()?.detalles ?? []);

  protected readonly todosRevisados = computed(() => {
    const items = this.detalles();
    return items.length > 0 && items.every((d) => this.estadoLinea(d) !== 'PENDIENTE');
  });

  protected readonly hayVerificados = computed(() =>
    this.detalles().some((d) => this.estadoLinea(d) === 'VERIFICADO')
  );

  protected readonly puedeAvanzar = computed(() => {
    const estado = this.estadoCabecera();
    if (estado === 'CREACION') {
      return this.detalles().length > 0;
    }
    if (estado === 'PENDIENTE_CONFERIR') {
      return this.todosRevisados() && this.hayVerificados();
    }
    if (estado === 'CONFERIDO') {
      return this.hayVerificados();
    }
    return false;
  });

  protected readonly avanzarLabel = computed(() => {
    switch (this.estadoCabecera()) {
      case 'CREACION':
        return 'Avanzar a conferir';
      case 'PENDIENTE_CONFERIR':
        return 'Conferir';
      case 'CONFERIDO':
        return 'Recepcionar';
      default:
        return 'Avanzar etapa';
    }
  });

  protected readonly avanzarHint = computed(() => {
    switch (this.estadoCabecera()) {
      case 'CREACION':
        return this.detalles().length === 0
          ? 'Agregá al menos un producto para avanzar a Pendiente a conferir.'
          : 'Cuando termines de cargar, avanzá a Pendiente a conferir.';
      case 'PENDIENTE_CONFERIR':
        if (!this.todosRevisados()) {
          return 'Aceptá o rechazá todos los productos antes de conferir.';
        }
        if (!this.hayVerificados()) {
          return 'Debe haber al menos un producto verificado para conferir.';
        }
        return 'Todos los productos revisados. Podés conferir la transferencia.';
      case 'CONFERIDO':
        return 'Confirmá la recepción en destino de los productos verificados.';
      case 'RECEPCIONADO':
        return 'Transferencia finalizada.';
      default:
        return null;
    }
  });

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
        if (
          this.normalizarEstadoCabecera(t.estado) === 'CREACION' &&
          t.sectorOrigen?.id_sector != null
        ) {
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

  protected onCantidadKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    this.confirmarAgregarProducto();
  }

  protected onProductoSelected(stock: StockProductoSectorOutput | null): void {
    const t = this.transferencia();
    if (!t || !this.esCreacion() || !stock?.producto?.id_producto) {
      return;
    }
    const idProducto = stock.producto.id_producto;
    // No bloqueamos duplicados a nivel frontend ya que con presentaciones puede haber varios

    this.error.set(null);
    this.productoPendiente.set(stock);
    this.presentacionSeleccionada.set(null);
    this.cantidadNueva.set(1);
    setTimeout(() => this.focusCantidad(), 0);
  }

  protected onPresentacionChange(idPresentacion: string): void {
    const presentaciones = this.presentacionesDisponibles();
    const id = Number(idPresentacion);
    if (!Number.isFinite(id) || id <= 0) {
      this.presentacionSeleccionada.set(null);
      return;
    }
    const found = presentaciones.find((p) => p.id_presentacion_producto === id);
    this.presentacionSeleccionada.set(found ?? null);
  }

  protected confirmarAgregarProducto(): void {
    const t = this.transferencia();
    const stock = this.productoPendiente();
    const idProducto = stock?.producto?.id_producto;
    if (!t || !this.esCreacion() || idProducto == null || this.saving()) {
      return;
    }

    const presentacion = this.presentacionSeleccionada();
    const idPresentacionProducto = presentacion?.id_presentacion_producto ?? null;

    this.saving.set(true);
    this.error.set(null);
    this.transferenciaService
      .agregarProducto(t.id_transferencia, {
        idProducto,
        idPresentacionProducto,
        cantidad: Math.max(1, this.cantidadNueva()),
      })
      .subscribe({
        next: (updated) => {
          this.transferencia.set(updated);
          this.productoPendiente.set(null);
          this.presentacionSeleccionada.set(null);
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

  private focusCantidad(): void {
    const el = this.cantidadInput()?.nativeElement;
    if (!el || el.disabled) {
      return;
    }
    el.focus();
    el.select();
  }

  protected onPageChange(event: PageChange): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  protected rowActionsFor(detalle: TransferenciaDetalleOutput): MenuAction[] {
    if (this.esCreacion()) {
      return [{ id: 'remove', label: 'Quitar', icon: 'delete' }];
    }
    if (!this.esPendienteConferir()) {
      return [];
    }
    const estado = this.estadoLinea(detalle);
    const actions: MenuAction[] = [];
    if (estado !== 'VERIFICADO') {
      actions.push({ id: 'accept', label: 'Aceptar', icon: 'check_circle' });
    }
    if (estado !== 'RECHAZADO') {
      actions.push({ id: 'reject', label: 'Rechazar', icon: 'cancel' });
    }
    return actions;
  }

  protected etapaClase(key: string): string {
    const actual = this.estadoCabecera();
    const order = this.etapas.map((e) => e.key);
    const iActual = order.indexOf(actual as (typeof order)[number]);
    const iKey = order.indexOf(key as (typeof order)[number]);
    if (iKey < 0 || iActual < 0) {
      return '';
    }
    if (iKey < iActual) {
      return 'is-done';
    }
    if (iKey === iActual) {
      return 'is-current';
    }
    return 'is-todo';
  }

  protected onRowAction(actionId: string, detalle: TransferenciaDetalleOutput): void {
    const t = this.transferencia();
    if (!t || detalle.id_detalle == null) {
      return;
    }
    if (actionId === 'accept') {
      this.aceptar(detalle);
      return;
    }
    if (actionId === 'reject') {
      this.abrirRechazo(detalle);
      return;
    }
    if (actionId !== 'remove') {
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

  protected aceptar(detalle: TransferenciaDetalleOutput): void {
    const t = this.transferencia();
    if (!t || detalle.id_detalle == null) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.transferenciaService.aceptarProducto(t.id_transferencia, detalle.id_detalle).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.saving.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo aceptar el producto');
        this.saving.set(false);
      },
    });
  }

  protected abrirRechazo(detalle: TransferenciaDetalleOutput): void {
    const t = this.transferencia();
    if (!t || detalle.id_detalle == null) {
      return;
    }
    const label = `${detalle.producto?.codigo ?? ''} — ${detalle.producto?.nombre ?? ''}`.trim();
    this.dialogService
      .openForm<RechazoDetalleResult>(RechazoDetalleDialogComponent, {
        title: 'Rechazar producto',
        subtitle: 'Indicá el motivo del rechazo',
        maxWidth: '480px',
        inputs: { productoLabel: label },
      })
      .subscribe((result) => {
        if (!result?.motivo) {
          return;
        }
        this.rechazar(detalle, result.motivo, result.detalle);
      });
  }

  protected rechazar(
    detalle: TransferenciaDetalleOutput,
    motivo: MotivoRechazoTransferencia,
    detalleMotivo?: string
  ): void {
    const t = this.transferencia();
    if (!t || detalle.id_detalle == null) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.transferenciaService
      .rechazarProducto(t.id_transferencia, detalle.id_detalle, motivo, detalleMotivo)
      .subscribe({
        next: (updated) => {
          this.transferencia.set(updated);
          this.saving.set(false);
          this.fetchStockPage(this.stockPage(), this.stockPageSize(), this.stockFilter());
        },
        error: (err: Error) => {
          this.error.set(err.message || 'No se pudo rechazar el producto');
          this.saving.set(false);
        },
      });
  }

  protected avanzarEtapa(): void {
    const t = this.transferencia();
    if (!t || !this.puedeAvanzar() || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    this.transferenciaService.avanzarEtapa(t.id_transferencia).subscribe({
      next: (updated) => {
        this.transferencia.set(updated);
        this.productoPendiente.set(null);
        this.presentacionSeleccionada.set(null);
        this.saving.set(false);
        if (
          this.normalizarEstadoCabecera(updated.estado) === 'CREACION' &&
          updated.sectorOrigen?.id_sector != null
        ) {
          this.fetchStockPage(0, this.stockPageSize());
        }
      },
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo avanzar de etapa');
        this.saving.set(false);
      },
    });
  }

  private normalizarEstadoCabecera(estado?: string | null): string {
    const n = (estado ?? 'CREACION').toUpperCase();
    if (n === 'PENDIENTE') {
      return 'CREACION';
    }
    return n;
  }

  protected personaLabel(t: TransferenciaOutput): string {
    const p = t.persona;
    if (!p) {
      return '—';
    }
    return [p.nombre, p.apellido].filter(Boolean).join(' ') || '—';
  }

  protected estadoLinea(detalle: TransferenciaDetalleOutput): string {
    return (detalle.estado ?? 'PENDIENTE').toUpperCase();
  }

  protected estadoLineaLabel(detalle: TransferenciaDetalleOutput): string {
    switch (this.estadoLinea(detalle)) {
      case 'VERIFICADO':
        return 'Verificado';
      case 'RECHAZADO':
        return 'Rechazado';
      case 'PENDIENTE':
        return 'Pendiente';
      default:
        return detalle.estado ?? '—';
    }
  }

  protected motivoLabel(detalle: TransferenciaDetalleOutput): string {
    if (this.estadoLinea(detalle) !== 'RECHAZADO') {
      return '';
    }
    const map: Record<string, string> = {
      AVERIADO: 'Averiado',
      VENCIDO: 'Vencido',
      ENVIADO_MAL: 'Enviado mal',
      OTRO: 'Otro',
    };
    const motivo = detalle.motivoRechazo ? map[detalle.motivoRechazo] ?? detalle.motivoRechazo : '';
    const extra = detalle.motivoRechazoDetalle?.trim();
    if (motivo && extra) {
      return `${motivo}: ${extra}`;
    }
    return extra || motivo;
  }

  protected trackById = (d: TransferenciaDetalleOutput): unknown => d.id_detalle;
}
