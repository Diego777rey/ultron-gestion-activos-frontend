import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button';
import { TabService } from '../../../shared/services/tab.service';
import { ProductoService } from '../../inventario/productos/services/producto.service';
import {
  PresentacionProductoOutput,
  ProductoOutput,
} from '../../inventario/productos/interfaces/producto.interface';
import { ServicioService } from '../../inventario/servicios/services/servicio.service';
import { ServicioOutput } from '../../inventario/servicios/interfaces/servicio.interface';
import { OrdenTrabajoService } from '../../taller/orden-de-trabajo/services/orden-trabajo.service';
import { OrdenTrabajoOutput, equiposDeOrden } from '../../taller/orden-de-trabajo/interfaces/orden-trabajo.interface';
import { AbrirCajaDialogComponent } from './dialogs/abrir-caja-dialog/abrir-caja-dialog.component';
import { PagoDialogComponent, PagoConfirmado } from './dialogs/pago-dialog/pago-dialog.component';
import { FacturaDialogComponent, FacturaConfirmada } from './dialogs/factura-dialog/factura-dialog.component';
import { ReimprimirTicketDialogComponent } from './dialogs/reimprimir-ticket-dialog/reimprimir-ticket-dialog.component';
import { RetiroCajaDialogComponent } from './dialogs/retiro-caja-dialog/retiro-caja-dialog.component';
import { VueltoDialogComponent } from './dialogs/vuelto-dialog/vuelto-dialog.component';
import { VueltoCalculado } from './interfaces/vuelto.interface';
import {
  PresentacionDialogComponent,
  PresentacionElegida,
} from './dialogs/presentacion-dialog/presentacion-dialog.component';
import { LoadingService } from '../../../shared/services/loading.service';
import { FileUploadService } from '../../../shared/services/file-upload.service';
import { SesionCajaService } from './services/sesion-caja.service';
import { TicketCierreCajaService } from './services/ticket-cierre-caja.service';
import { VentaPosService } from './services/venta.service';
import { SesionCajaOutput } from './interfaces/sesion-caja.interface';
import { CartItem, DetalleVentaInput, FormaPago, VentaOutput } from './interfaces/venta.interface';
import { ImpresionService } from '../../../shared/services/impresion.service';
import { TicketFactura, TicketVenta } from '../../../shared/models/impresion.model';
import { FacturaService } from '../../financiero/facturacion/services/factura.service';
import { FacturaOutput } from '../../financiero/facturacion/interfaces/factura.interface';
import { CATALOG_PAGE_SIZE } from '../../../shared/models/pagination.model';
import { AuthService } from '../../../core/auth/auth.service';
import { NotifyErrorComponent } from '../../../shared/components/notify-error/notify-error';

const POS_ROUTE = '/ventas/punto-de-venta';
/** Umbral (px) antes del final del scroll para pedir la siguiente página. */
const SCROLL_LOAD_THRESHOLD_PX = 120;

export type CatalogoPos = 'productos' | 'servicios' | 'ordenes';
export type PdvNumero = 1 | 2;

@Component({
  selector: 'app-punto-de-venta',
  imports: [NotifyErrorComponent, 
    ModalComponent,
    AbrirCajaDialogComponent,
    PagoDialogComponent,
    FacturaDialogComponent,
    ReimprimirTicketDialogComponent,
    RetiroCajaDialogComponent,
    VueltoDialogComponent,
    PresentacionDialogComponent,
    UiButtonComponent,
    DecimalPipe,
  ],
  templateUrl: './punto-de-venta.component.html',
  styleUrls: [
    './punto-de-venta.component.scss',
    './punto-de-venta-catalog.scss',
    './punto-de-venta-dialog.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-list-view',
    '(document:keydown.f2)': 'onPdvShortcut($event)',
  },
})
export class PuntoDeVentaComponent {
  private readonly tabService = inject(TabService);
  private readonly router = inject(Router);
  private readonly sesionCajaService = inject(SesionCajaService);
  private readonly ventaService = inject(VentaPosService);
  private readonly impresion = inject(ImpresionService);
  private readonly ticketCierreCaja = inject(TicketCierreCajaService);
  private readonly facturaService = inject(FacturaService);
  private readonly auth = inject(AuthService);
  private readonly loading = inject(LoadingService);
  private readonly productoService = inject(ProductoService);
  private readonly servicioService = inject(ServicioService);
  private readonly ordenTrabajoService = inject(OrdenTrabajoService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly fileUploadService = inject(FileUploadService);

  readonly inicioDialogOpen = signal(true);
  readonly gestionCajaOpen = signal(false);
  readonly pagoDialogOpen = signal(false);
  /** Vuelto de la última venta en efectivo, mostrado hasta que el cajero confirma que lo entregó. */
  readonly vueltoPendiente = signal<{ vuelto: VueltoCalculado; numeroVenta: string } | null>(null);
  readonly facturaDialogOpen = signal(false);
  readonly reimprimirDialogOpen = signal(false);
  readonly retiroDialogOpen = signal(false);
  readonly maletinVerificado = signal(false);
  readonly cajaAbierta = signal(false);
  readonly sesion = signal<SesionCajaOutput | null>(null);
  readonly loadingSesion = signal(true);

  readonly catalogo = signal<CatalogoPos>('productos');
  private readonly imagenesFallidas = signal<ReadonlySet<string>>(new Set());
  readonly productos = signal<ProductoOutput[]>([]);
  readonly loadingProductos = signal(false);
  readonly loadingMoreProductos = signal(false);
  readonly productosLastPage = signal(true);
  private productosPage = 0;
  private readonly productoSearch$ = new Subject<string>();

  readonly servicios = signal<ServicioOutput[]>([]);
  readonly ordenesFinalizadas = signal<OrdenTrabajoOutput[]>([]);
  readonly loadingServicios = signal(false);
  readonly loadingOrdenes = signal(false);
  readonly search = signal('');
  readonly presentacionDialogProducto = signal<ProductoOutput | null>(null);
  readonly pdvActivo = signal<PdvNumero>(1);
  private readonly cartPdv1 = signal<CartItem[]>([]);
  private readonly cartPdv2 = signal<CartItem[]>([]);
  readonly selling = signal(false);
  readonly ventaError = signal<string | null>(null);

  readonly cart = computed(() =>
    this.pdvActivo() === 2 ? this.cartPdv2() : this.cartPdv1()
  );
  readonly isPdvAuxiliar = computed(() => this.pdvActivo() === 2);
  readonly etiquetaPdvActivo = computed(() => (this.pdvActivo() === 2 ? 'PDV 2' : 'PDV 1'));
  readonly etiquetaPdvAlterno = computed(() =>
    this.pdvActivo() === 2 ? 'PDV 1 (F2)' : 'PDV 2 (F2)'
  );

  readonly pasoInicialGestion = computed(() => {
    if (!this.maletinVerificado()) {
      return 1;
    }
    if (this.cajaAbierta()) {
      return 3;
    }
    return 2;
  });

  readonly mostrandoProductos = computed(() => this.catalogo() === 'productos');
  readonly mostrandoServicios = computed(() => this.catalogo() === 'servicios');
  readonly mostrandoOrdenes = computed(() => this.catalogo() === 'ordenes');

  /** Productos ya vienen filtrados por el backend; solo se ocultan los inactivos. */
  readonly productosVisibles = computed(() =>
    this.productos().filter((p) => p.estado !== false)
  );

  readonly serviciosFiltrados = computed(() => {
    const q = this.search().trim().toLowerCase();
    const items = this.servicios().filter((s) => s.estado !== false);
    if (!q) {
      return items;
    }
    return items.filter(
      (s) =>
        s.nombre.toLowerCase().includes(q) ||
        (s.codigo ?? '').toLowerCase().includes(q) ||
        (s.categoriaServicio?.nombre ?? '').toLowerCase().includes(q)
    );
  });

  readonly ordenesFiltradas = computed(() => {
    const q = this.search().trim().toLowerCase();
    const items = this.ordenesFinalizadas();
    if (!q) {
      return items;
    }
    return items.filter((orden) => this.textoOrden(orden).toLowerCase().includes(q));
  });

  readonly cartTotal = computed(() =>
    this.cart().reduce((acc, item) => acc + item.cantidad * item.precioUnitario, 0)
  );

  readonly cartCount = computed(() =>
    this.cart().reduce((acc, item) => acc + item.cantidad, 0)
  );

  constructor() {
    this.productoSearch$
      .pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadProductos(true));
    this.bootstrap();
  }

  onSalirPos(): void {
    this.cerrarPuntoDeVenta();
  }

  onAbrirGestionCaja(): void {
    this.inicioDialogOpen.set(false);
    this.gestionCajaOpen.set(true);
  }

  onMaletinConfirmado(): void {
    this.maletinVerificado.set(true);
  }

  onCajaAbierta(sesion: SesionCajaOutput): void {
    this.sesion.set(sesion);
    this.cajaAbierta.set(true);
    this.maletinVerificado.set(true);
    this.gestionCajaOpen.set(false);
    this.inicioDialogOpen.set(false);
    this.loadProductos(true);
    this.loadServicios();
  }

  onCajaCerrada(cerrada: SesionCajaOutput): void {
    this.ticketCierreCaja.imprimir(cerrada.id_sesion_caja).subscribe();
    this.sesion.set(null);
    this.cajaAbierta.set(false);
    this.maletinVerificado.set(false);
    this.resetearPdvs();
    this.catalogo.set('productos');
    this.ordenesFinalizadas.set([]);
    this.servicios.set([]);
    this.productos.set([]);
    this.productosPage = 0;
    this.productosLastPage.set(true);
    this.gestionCajaOpen.set(false);
    this.inicioDialogOpen.set(true);
  }

  onSalirGestionCaja(): void {
    this.gestionCajaOpen.set(false);
    if (this.cajaAbierta()) {
      return;
    }
    this.inicioDialogOpen.set(true);
  }

  protected onSearchInput(value: string): void {
    this.search.set(value);
    if (this.mostrandoProductos()) {
      this.productoSearch$.next(value);
    }
  }

  protected onProductListScroll(event: Event): void {
    if (!this.mostrandoProductos()) {
      return;
    }
    const el = event.target as HTMLElement;
    if (el.scrollTop + el.clientHeight < el.scrollHeight - SCROLL_LOAD_THRESHOLD_PX) {
      return;
    }
    this.loadMoreProductos();
  }

  protected imagenProductoUrl(producto: ProductoOutput): string | null {
    const path = producto.imagen?.trim();
    return path && !this.imagenesFallidas().has(path) ? this.fileUploadService.getFileUrl(path) : null;
  }

  protected onImagenError(producto: ProductoOutput): void {
    const path = producto.imagen?.trim();
    if (path) {
      this.imagenesFallidas.update((fallidas) => new Set(fallidas).add(path));
    }
  }

  protected mostrarProductos(): void {
    this.catalogo.set('productos');
    this.search.set('');
    this.ventaError.set(null);
    this.loadProductos(true);
  }

  protected mostrarServicios(): void {
    this.catalogo.set('servicios');
    this.search.set('');
    this.ventaError.set(null);
    if (this.servicios().length === 0) {
      this.loadServicios();
    }
  }

  protected mostrarOrdenesFinalizadas(): void {
    this.catalogo.set('ordenes');
    this.search.set('');
    this.ventaError.set(null);
    this.loadOrdenesFinalizadas();
  }

  protected presentacionesDe(producto: ProductoOutput): PresentacionProductoOutput[] {
    return producto.presentaciones ?? [];
  }

  protected stockProducto(producto: ProductoOutput): number {
    return Number(producto.stock ?? 0) - this.unidadesComprometidas(producto.id_producto);
  }

  protected onProductoClick(producto: ProductoOutput): void {
    if (this.presentacionesDe(producto).length > 0) {
      this.presentacionDialogProducto.set(producto);
      return;
    }
    this.agregarPresentacion(producto, null, 1);
  }

  protected cerrarPresentacionDialog(): void {
    this.presentacionDialogProducto.set(null);
  }

  protected confirmarPresentacion(elegida: PresentacionElegida): void {
    const producto = this.presentacionDialogProducto();
    if (!producto) {
      return;
    }
    this.agregarPresentacion(producto, elegida.presentacion, elegida.cantidad);
    this.presentacionDialogProducto.set(null);
  }

  private agregarPresentacion(
    producto: ProductoOutput,
    presentacion: PresentacionProductoOutput | null,
    cantidad: number
  ): void {
    const aVender = cantidad > 0 ? cantidad : 1;
    const unidades = this.unidadesDePresentacion(presentacion);
    const stock = Number(producto.stock ?? 0);

    this.ventaError.set(null);
    const idPresentacion = presentacion?.id_presentacion_producto;
    const precio = presentacion ? Number(presentacion.precio ?? 0) : Number(producto.precioVenta ?? 0);
    this.cartActivo().update((items) => {
      const idx = items.findIndex(
        (item) =>
          item.tipo === 'PRODUCTO' &&
          item.idProducto === producto.id_producto &&
          (item.idPresentacion ?? null) === (idPresentacion ?? null)
      );
      if (idx >= 0) {
        const current = items[idx];
        const next = [...items];
        next[idx] = { ...current, cantidad: current.cantidad + aVender, stockDisponible: stock };
        return next;
      }
      return [
        ...items,
        {
          tipo: 'PRODUCTO',
          idProducto: producto.id_producto,
          idPresentacion: idPresentacion ?? undefined,
          presentacion: presentacion?.descripcion,
          unidadesPorPresentacion: unidades,
          nombre: producto.nombre,
          cantidad: aVender,
          precioUnitario: precio,
          stockDisponible: stock,
        },
      ];
    });
  }

  protected addServicio(servicio: ServicioOutput): void {
    const precio = Number(servicio.precio ?? 0);
    if (precio < 0) {
      this.ventaError.set(`El servicio ${servicio.nombre} no tiene un precio válido`);
      return;
    }

    this.ventaError.set(null);
    this.cartActivo().update((items) => {
      const idx = items.findIndex(
        (i) => i.tipo === 'SERVICIO' && i.idServicio === servicio.id_servicio
      );
      if (idx >= 0) {
        const current = items[idx];
        const next = [...items];
        next[idx] = { ...current, cantidad: current.cantidad + 1 };
        return next;
      }
      return [
        ...items,
        {
          tipo: 'SERVICIO',
          idServicio: servicio.id_servicio,
          nombre: servicio.nombre,
          cantidad: 1,
          precioUnitario: precio,
          stockDisponible: Number.MAX_SAFE_INTEGER,
        },
      ];
    });
  }

  protected addOrden(orden: OrdenTrabajoOutput): void {
    const idOrden = Number(orden.id_orden_trabajo);
    if (!idOrden) {
      this.ventaError.set('La orden no tiene identificador');
      return;
    }
    if (this.ordenEnCarritos(idOrden)) {
      this.ventaError.set(
        `La orden ${orden.numero_orden ?? idOrden} ya está en un carrito (PDV 1 o PDV 2)`
      );
      return;
    }

    const total = this.totalOrden(orden);
    if (total <= 0) {
      this.ventaError.set(`La orden ${orden.numero_orden ?? idOrden} no tiene un monto para cobrar`);
      return;
    }

    this.ventaError.set(null);
    this.cartActivo().update((items) => [
      ...items,
      {
        tipo: 'ORDEN',
        idOrdenTrabajo: idOrden,
        idCliente: orden.cliente?.id_cliente != null ? Number(orden.cliente.id_cliente) : null,
        nombre: this.etiquetaOrden(orden),
        cantidad: 1,
        precioUnitario: total,
        stockDisponible: 1,
      },
    ]);
  }

  protected ajustarCantidad(index: number, delta: number): void {
    this.cartActivo().update((items) => {
      const next = [...items];
      const item = next[index];
      if (!item) {
        return items;
      }
      if (item.tipo === 'ORDEN') {
        return items;
      }
      const cantidad = item.cantidad + delta;
      if (cantidad <= 0) {
        next.splice(index, 1);
        return next;
      }
      next[index] = { ...item, cantidad };
      return next;
    });
  }

  protected removeItem(index: number): void {
    this.cartActivo().update((items) => items.filter((_, i) => i !== index));
  }

  protected clearCart(): void {
    this.cartActivo().set([]);
    this.ventaError.set(null);
  }

  protected cambiarPdv(): void {
    if (!this.puedeCambiarPdv()) {
      return;
    }
    this.pdvActivo.update((n) => (n === 1 ? 2 : 1));
    this.ventaError.set(null);
  }

  protected onPdvShortcut(event: Event): void {
    event.preventDefault();
    if (this.presentacionDialogProducto()) {
      return;
    }
    this.cambiarPdv();
  }

  protected abrirPagoDialog(): void {
    if (this.cart().length === 0) {
      this.ventaError.set('Agregá ítems al carrito antes de cobrar');
      return;
    }
    this.pagoDialogOpen.set(true);
  }

  protected abrirFactura(): void {
    if (this.cart().length === 0) {
      this.ventaError.set('Agregá ítems al carrito antes de facturar');
      return;
    }
    this.facturaDialogOpen.set(true);
  }

  protected cerrarPagoDialog(): void {
    this.pagoDialogOpen.set(false);
  }

  protected cobrarConMetodo(pago: PagoConfirmado): void {
    this.pagoDialogOpen.set(false);
    this.registrarVenta(false, pago.formaPago, pago.moneda, undefined, pago);
  }

  protected cerrarVueltoDialog(): void {
    this.vueltoPendiente.set(null);
  }

  protected abrirReimprimirDialog(): void {
    const sesion = this.sesion();
    if (!sesion?.id_sesion_caja) {
      this.ventaError.set('No hay sesión de caja abierta');
      return;
    }
    this.reimprimirDialogOpen.set(true);
  }

  protected cerrarReimprimirDialog(): void {
    this.reimprimirDialogOpen.set(false);
  }

  protected abrirRetiroDialog(): void {
    if (!this.sesion()?.id_sesion_caja) {
      this.ventaError.set('No hay sesión de caja abierta');
      return;
    }
    this.retiroDialogOpen.set(true);
  }

  protected cerrarRetiroDialog(): void {
    this.retiroDialogOpen.set(false);
  }

  protected reimprimirTicket(venta: VentaOutput): void {
    this.reimprimirDialogOpen.set(false);
    this.facturaService.porVenta(venta.id_venta).subscribe({
      next: (factura) => {
        if (factura) {
          this.impresion.imprimirFactura(this.toTicketFactura(factura)).subscribe();
          return;
        }
        this.imprimirTicket(venta);
      },
      error: () => this.imprimirTicket(venta),
    });
  }

  protected cobrar(): void {
    this.registrarVenta(false, 'EFECTIVO', 'PYG');
  }

  protected cobrarConTicket(): void {
    this.registrarVenta(true, 'EFECTIVO', 'PYG');
  }

  protected cerrarFacturaDialog(): void {
    this.facturaDialogOpen.set(false);
  }

  protected facturarConCliente(factura: FacturaConfirmada): void {
    this.facturaDialogOpen.set(false);
    this.registrarVenta(true, 'EFECTIVO', 'PYG', factura.idCliente);
  }

  private registrarVenta(
    imprimirTicket: boolean,
    formaPago: FormaPago = 'EFECTIVO',
    moneda: string = 'PYG',
    idCliente?: number,
    pago?: PagoConfirmado,
  ): void {
    const sesion = this.sesion();
    const items = this.cart();
    if (!sesion?.id_sesion_caja) {
      this.ventaError.set('No hay sesión de caja abierta');
      return;
    }
    if (items.length === 0) {
      this.ventaError.set('Agregá ítems al carrito');
      return;
    }

    const ordenCliente = items.find((item) => item.tipo === 'ORDEN' && item.idCliente != null);

    const input = {
      idSesionCaja: sesion.id_sesion_caja,
      idCliente: idCliente ?? ordenCliente?.idCliente ?? null,
      descuento: 0,
      formaPago,
      moneda: moneda !== 'PYG' ? moneda : undefined,
      montoRecibido: pago?.montoRecibido,
      monedaVuelto: pago?.monedaVuelto,
      detalles: items.map((item) => this.toDetalleInput(item)),
    };
    this.selling.set(true);
    this.ventaError.set(null);
    const alCobrar = (venta: VentaOutput) => {
      this.selling.set(false);
      this.cartActivo().set([]);
      this.mostrarVuelto(venta, pago?.vuelto);
      this.refreshSesion();
      this.loadProductos(true);
      if (this.mostrandoOrdenes() || items.some((item) => item.tipo === 'ORDEN')) {
        this.loadOrdenesFinalizadas();
      }
    };
    const alFallar = (err: Error, fallback: string) => {
      this.selling.set(false);
      this.ventaError.set(err.message || fallback);
    };

    if (imprimirTicket) {
      this.loading
        .track(this.ventaService.registrarVentaConFactura(input), {
          message: 'Cobrando y emitiendo la factura…',
          errorTitle: 'No se pudo emitir la factura',
          notifyError: false,
        })
        .subscribe({
          next: ({ venta, factura }) => {
            alCobrar(venta);
            this.impresion.imprimirFactura(this.toTicketFactura(factura)).subscribe();
          },
          error: (err: Error) => alFallar(err, 'No se pudo emitir la factura'),
        });
      return;
    }

    this.loading
      .track(this.ventaService.registrarVenta(input), {
        message: 'Cobrando…',
        errorTitle: 'No se pudo registrar la venta',
        notifyError: false,
      })
      .subscribe({
        next: (venta) => alCobrar(venta),
        error: (err: Error) => alFallar(err, 'No se pudo registrar la venta'),
      });
  }

  /**
   * El vuelto que manda el backend en la venta es la fuente de verdad; el desglose
   * en billetes y monedas es el que ya calculó el backend para ese mismo monto.
   */
  private mostrarVuelto(venta: VentaOutput, calculo?: VueltoCalculado): void {
    const vueltoPyg = Number(venta.vueltoPyg ?? venta.vuelto ?? 0);
    if (!calculo || vueltoPyg <= 0 || calculo.vueltoPyg !== vueltoPyg) {
      return;
    }
    this.vueltoPendiente.set({ vuelto: calculo, numeroVenta: venta.numero });
  }

  private imprimirTicket(venta: VentaOutput): void {
    this.impresion.imprimirTicketVenta(this.toTicketVenta(venta)).subscribe();
  }

  private toTicketVenta(venta: VentaOutput): TicketVenta {
    return {
      titulo: 'CH-SERVICE',
      subtitulo: null,
      numero: venta.numero,
      fecha: this.formatFechaTicket(venta.fecha),
      cajero: this.auth.currentUsername()?.trim() || null,
      cliente: venta.clienteNombre?.trim() || 'Consumidor final',
      lineas: (venta.detalles ?? []).map((detalle) => ({
        descripcion: detalle.productoNombre?.trim() || 'Item',
        cantidad: Number(detalle.cantidad ?? 1),
        precioUnitario: Number(detalle.precioUnitario ?? 0),
        subtotal: Number(detalle.subtotal ?? 0),
      })),
      descuento: Number(venta.descuento ?? 0),
      total: Number(venta.total ?? 0),
      montoRecibido: venta.montoRecibido != null ? Number(venta.montoRecibido) : null,
      monedaRecibida: venta.moneda ?? null,
      montoRecibidoPyg: venta.montoRecibidoPyg != null ? Number(venta.montoRecibidoPyg) : null,
      vuelto: venta.vuelto != null ? Number(venta.vuelto) : null,
      monedaVuelto: venta.monedaVuelto ?? null,
      vueltoPyg: venta.vueltoPyg != null ? Number(venta.vueltoPyg) : null,
      pie: 'Gracias por su compra',
    };
  }

  private toTicketFactura(factura: FacturaOutput): TicketFactura {
    const lineas = (factura.detalles ?? []).map((detalle) => ({
      descripcion: detalle.descripcion?.trim() || 'Item',
      cantidad: Number(detalle.cantidad ?? 1),
      precioUnitario: Number(detalle.precio_unitario ?? 0),
      subtotal: Number(detalle.subtotal ?? 0),
      tipoIva: (detalle.tipo_iva ?? '10').toUpperCase(),
    }));
    let totalExenta = 0;
    let totalGravada5 = 0;
    let totalGravada10 = 0;
    for (const linea of lineas) {
      if (linea.tipoIva === '5') {
        totalGravada5 += linea.subtotal;
      } else if (linea.tipoIva === 'EXENTA') {
        totalExenta += linea.subtotal;
      } else {
        totalGravada10 += linea.subtotal;
      }
    }
    const documento = factura.cliente_ruc?.trim() || factura.cliente_documento?.trim() || null;
    return {
      razonSocial: factura.empresa_razon_social?.trim() || 'SIN RAZON SOCIAL',
      nombreFantasia: factura.empresa_nombre_fantasia?.trim() || null,
      ruc: factura.empresa_ruc?.trim() || '-',
      direccion: factura.empresa_direccion?.trim() || null,
      telefono: factura.empresa_telefono?.trim() || null,
      actividadEconomica: factura.empresa_actividad_economica?.trim() || null,
      timbrado: factura.timbrado?.trim() || '-',
      vigenciaInicio: factura.timbrado_vigencia_inicio?.trim() || '-',
      vigenciaFin: factura.timbrado_vigencia_fin?.trim() || '-',
      numeroFactura: factura.numero_factura?.trim() || '-',
      fecha: factura.fecha_emision?.trim() || this.formatFechaTicket(),
      condicion: 'CONTADO',
      formaPago: etiquetaFormaPago(factura.forma_pago),
      clienteNombre: factura.cliente_nombre?.trim() || 'SIN NOMBRE',
      clienteDocumento: documento,
      clienteDireccion: factura.cliente_direccion?.trim() || null,
      lineas,
      totalExenta,
      totalGravada5,
      totalGravada10,
      totalIva5: Number(factura.total_iva_5 ?? 0),
      totalIva10: Number(factura.total_iva_10 ?? 0),
      total: Number(factura.total ?? 0),
    };
  }

  private formatFechaTicket(value?: string): string {
    if (!value) {
      return new Date().toLocaleString('es-PY');
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString('es-PY');
  }

  protected totalOrden(orden: OrdenTrabajoOutput): number {
    const presupuesto = Number(orden.diagnostico?.total_presupuesto ?? 0);
    if (presupuesto > 0) {
      return presupuesto;
    }
    return (orden.detalles ?? []).reduce((acc, detalle) => acc + Number(detalle.subtotal ?? 0), 0);
  }

  protected etiquetaOrden(orden: OrdenTrabajoOutput): string {
    const numero = orden.numero_orden || 'Orden';
    const chapa = orden.vehiculo?.chapa?.trim();
    return chapa ? `${numero} · ${chapa}` : numero;
  }

  protected detalleOrden(orden: OrdenTrabajoOutput): string {
    const cliente = [orden.cliente?.persona?.nombre, orden.cliente?.persona?.apellido]
      .filter(Boolean)
      .join(' ')
      .trim();
    const vehiculo = [orden.vehiculo?.marca, orden.vehiculo?.modelo].filter(Boolean).join(' ').trim();
    const equipos = equiposDeOrden(orden).map((e) => e.tipo_equipo).filter(Boolean).join(', ');
    return [cliente || 'Sin cliente', equipos, vehiculo].filter(Boolean).join(' · ');
  }

  private textoOrden(orden: OrdenTrabajoOutput): string {
    return [
      orden.numero_orden,
      ...equiposDeOrden(orden).flatMap((e) => [e.tipo_equipo, e.numero_serie]),
      orden.vehiculo?.chapa,
      orden.vehiculo?.marca,
      orden.vehiculo?.modelo,
      orden.cliente?.persona?.nombre,
      orden.cliente?.persona?.apellido,
      orden.cliente?.persona?.documento,
    ]
      .filter(Boolean)
      .join(' ');
  }

  private cartActivo() {
    return this.pdvActivo() === 2 ? this.cartPdv2 : this.cartPdv1;
  }

  private puedeCambiarPdv(): boolean {
    return this.cajaAbierta() && !this.gestionCajaOpen() && !this.selling();
  }

  private resetearPdvs(): void {
    this.pdvActivo.set(1);
    this.cartPdv1.set([]);
    this.cartPdv2.set([]);
  }

  private ordenEnCarritos(idOrden: number): boolean {
    const enCarrito = (items: CartItem[]) =>
      items.some((item) => item.tipo === 'ORDEN' && item.idOrdenTrabajo === idOrden);
    return enCarrito(this.cartPdv1()) || enCarrito(this.cartPdv2());
  }

  private toDetalleInput(item: CartItem): DetalleVentaInput {
    if (item.tipo === 'ORDEN') {
      return {
        idOrdenTrabajo: item.idOrdenTrabajo,
        descripcion: item.nombre,
        cantidad: 1,
        precioUnitario: item.precioUnitario,
      };
    }
    if (item.tipo === 'SERVICIO') {
      return {
        idServicio: item.idServicio,
        descripcion: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
      };
    }
    return {
      idProducto: item.idProducto,
      idPresentacion: item.idPresentacion ?? null,
      descripcion: item.presentacion ?? null,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
    };
  }

  private unidadesDePresentacion(presentacion: PresentacionProductoOutput | null): number {
    const cantidad = Number(presentacion?.cantidad ?? 1);
    return cantidad > 0 ? cantidad : 1;
  }

  private unidadesComprometidas(idProducto: number): number {
    const otro = this.pdvActivo() === 2 ? this.cartPdv1() : this.cartPdv2();
    return this.unidadesEn(this.cartActivo()(), idProducto) + this.unidadesEn(otro, idProducto);
  }

  private unidadesEn(items: CartItem[], idProducto: number): number {
    return items
      .filter((item) => item.tipo === 'PRODUCTO' && item.idProducto === idProducto)
      .reduce((acc, item) => acc + item.cantidad * (item.unidadesPorPresentacion || 1), 0);
  }

  private bootstrap(): void {
    this.loadingSesion.set(true);
    this.sesionCajaService.sesionAbierta().subscribe({
      next: (sesion) => {
        this.loadingSesion.set(false);
        if (sesion && sesion.estado === 'ABIERTA') {
          this.sesion.set(sesion);
          this.cajaAbierta.set(true);
          this.maletinVerificado.set(true);
          this.inicioDialogOpen.set(false);
          this.loadProductos(true);
          this.loadServicios();
        }
      },
      error: () => {
        this.loadingSesion.set(false);
      },
    });
  }
  
  private refreshSesion(): void {
    const idCaja = this.sesion()?.caja?.id_caja;
    this.sesionCajaService.sesionAbierta(idCaja).subscribe({
      next: (sesion) => {
        if (sesion) {
          this.sesion.set(sesion);
        }
      },
    });
  }

  private loadMoreProductos(): void {
    if (this.productosLastPage() || this.loadingProductos() || this.loadingMoreProductos()) {
      return;
    }
    this.loadProductos(false);
  }

  /**
   * Carga productos paginados (estándar: {@link CATALOG_PAGE_SIZE}).
   * `reset` reemplaza la lista (búsqueda / apertura); `false` concatena la siguiente página (scroll).
   */
  private loadProductos(reset: boolean): void {
    if (reset) {
      this.productosPage = 0;
      this.productosLastPage.set(false);
      this.loadingProductos.set(true);
    } else {
      if (this.productosLastPage() || this.loadingProductos() || this.loadingMoreProductos()) {
        return;
      }
      this.productosPage += 1;
      this.loadingMoreProductos.set(true);
    }

    const page = this.productosPage;
    const filter = this.search().trim();

    this.productoService.findPaginated(page, CATALOG_PAGE_SIZE, filter || undefined).subscribe({
      next: (response) => {
        const content = response?.content ?? [];
        const last = response?.pageInfo?.last ?? content.length < CATALOG_PAGE_SIZE;
        this.productos.update((current) => (reset ? content : [...current, ...content]));
        this.productosLastPage.set(last);
        this.loadingProductos.set(false);
        this.loadingMoreProductos.set(false);
      },
      error: (err: Error) => {
        if (!reset) {
          this.productosPage = Math.max(0, this.productosPage - 1);
        }
        this.loadingProductos.set(false);
        this.loadingMoreProductos.set(false);
        this.ventaError.set(err.message || 'No se pudieron cargar productos');
      },
    });
  }

  private loadServicios(): void {
    this.loadingServicios.set(true);
    this.servicioService.findAll().subscribe({
      next: (items) => {
        this.servicios.set(items);
        this.loadingServicios.set(false);
      },
      error: (err: Error) => {
        this.loadingServicios.set(false);
        this.ventaError.set(err.message || 'No se pudieron cargar los servicios');
      },
    });
  }

  private loadOrdenesFinalizadas(): void {
    this.loadingOrdenes.set(true);
    this.ordenTrabajoService.listarPorEtapa('FINALIZADA').subscribe({
      next: (items) => {
        this.ordenesFinalizadas.set(items.filter((orden) => orden.etapa === 'FINALIZADA'));
        this.loadingOrdenes.set(false);
      },
      error: (err: Error) => {
        this.loadingOrdenes.set(false);
        this.ventaError.set(err.message || 'No se pudieron cargar las órdenes finalizadas');
      },
    });
  }

  private cerrarPuntoDeVenta(): void {
    const tabIndex = this.tabService.tabs().findIndex((tab) => tab.url === POS_ROUTE);
    if (tabIndex >= 0) {
      this.tabService.removeTab(tabIndex);
      return;
    }
    void this.router.navigateByUrl('/pantalla-principal');
  }
}

function etiquetaFormaPago(forma?: string | null): string {
  switch ((forma ?? '').toUpperCase()) {
    case 'TARJETA':
      return 'TARJETA';
    case 'TRANSFERENCIA':
      return 'TRANSFERENCIA';
    default:
      return 'EFECTIVO';
  }
}
