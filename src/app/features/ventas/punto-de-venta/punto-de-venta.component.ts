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
import { ProductoOutput } from '../../inventario/productos/interfaces/producto.interface';
import { ServicioService } from '../../inventario/servicios/services/servicio.service';
import { ServicioOutput } from '../../inventario/servicios/interfaces/servicio.interface';
import { OrdenTrabajoService } from '../../taller/orden-de-trabajo/services/orden-trabajo.service';
import { OrdenTrabajoOutput } from '../../taller/orden-de-trabajo/interfaces/orden-trabajo.interface';
import { AbrirCajaDialogComponent } from './dialogs/abrir-caja-dialog/abrir-caja-dialog.component';
import { PagoDialogComponent } from './dialogs/pago-dialog/pago-dialog.component';
import { LoadingService } from '../../../shared/services/loading.service';
import { FileUploadService } from '../../../shared/services/file-upload.service';
import { SesionCajaService } from './services/sesion-caja.service';
import { VentaPosService } from './services/venta.service';
import { SesionCajaOutput } from './interfaces/sesion-caja.interface';
import { CartItem, DetalleVentaInput, FormaPago, VentaOutput } from './interfaces/venta.interface';
import { ImpresionService } from '../../../shared/services/impresion.service';
import { TicketVenta } from '../../../shared/models/impresion.model';
import { CATALOG_PAGE_SIZE } from '../../../shared/models/pagination.model';
import { AuthService } from '../../../core/auth/auth.service';

const POS_ROUTE = '/ventas/punto-de-venta';
/** Umbral (px) antes del final del scroll para pedir la siguiente página. */
const SCROLL_LOAD_THRESHOLD_PX = 120;

export type CatalogoPos = 'productos' | 'servicios' | 'ordenes';
export type PdvNumero = 1 | 2;

@Component({
  selector: 'app-punto-de-venta',
  imports: [ModalComponent, AbrirCajaDialogComponent, PagoDialogComponent, UiButtonComponent, DecimalPipe],
  templateUrl: './punto-de-venta.component.html',
  styleUrls: ['./punto-de-venta.component.scss', './punto-de-venta-dialog.scss'],
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
  readonly maletinVerificado = signal(false);
  readonly cajaAbierta = signal(false);
  readonly sesion = signal<SesionCajaOutput | null>(null);
  readonly loadingSesion = signal(true);

  readonly catalogo = signal<CatalogoPos>('productos');
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

  onCajaCerrada(): void {
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
    return path ? this.fileUploadService.getFileUrl(path) : null;
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

  protected addProducto(producto: ProductoOutput): void {
    const stock = Number(producto.stock ?? 0);
    const stockDisponible = stock - this.cantidadProductoEnOtroPdv(producto.id_producto);
    if (stockDisponible <= 0) {
      this.ventaError.set(`Sin stock: ${producto.nombre}`);
      return;
    }

    this.ventaError.set(null);
    this.cartActivo().update((items) => {
      const idx = items.findIndex(
        (i) => i.tipo === 'PRODUCTO' && i.idProducto === producto.id_producto
      );
      if (idx >= 0) {
        const current = items[idx];
        const nuevaCantidad = current.cantidad + 1;
        if (nuevaCantidad > stockDisponible) {
          this.ventaError.set(`Stock insuficiente para ${producto.nombre}`);
          return items;
        }
        const next = [...items];
        next[idx] = { ...current, cantidad: nuevaCantidad, stockDisponible };
        return next;
      }
      return [
        ...items,
        {
          tipo: 'PRODUCTO',
          idProducto: producto.id_producto,
          nombre: producto.nombre,
          cantidad: 1,
          precioUnitario: Number(producto.precioVenta),
          stockDisponible,
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
      if (item.tipo === 'PRODUCTO') {
        const producto = this.productos().find((p) => p.id_producto === item.idProducto);
        const stock = Number(producto?.stock ?? item.stockDisponible);
        const disponible = stock - this.cantidadProductoEnOtroPdv(item.idProducto ?? 0);
        if (cantidad > disponible) {
          this.ventaError.set(`Stock insuficiente para ${item.nombre}`);
          return items;
        }
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
    this.cambiarPdv();
  }

  protected abrirPagoDialog(): void {
    if (this.cart().length === 0) {
      this.ventaError.set('Agregá ítems al carrito antes de cobrar');
      return;
    }
    this.pagoDialogOpen.set(true);
  }

  protected cerrarPagoDialog(): void {
    this.pagoDialogOpen.set(false);
  }

  protected cobrarConMetodo(formaPago: FormaPago): void {
    this.pagoDialogOpen.set(false);
    this.registrarVenta(false, formaPago);
  }

  protected cobrar(): void {
    this.registrarVenta(false, 'EFECTIVO');
  }

  protected cobrarConTicket(): void {
    this.registrarVenta(true, 'EFECTIVO');
  }

  private registrarVenta(imprimirTicket: boolean, formaPago: FormaPago = 'EFECTIVO'): void {
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

    this.selling.set(true);
    this.ventaError.set(null);
    this.loading
      .track(
        this.ventaService.registrarVenta({
          idSesionCaja: sesion.id_sesion_caja,
          idCliente: ordenCliente?.idCliente ?? null,
          descuento: 0,
          formaPago,
          detalles: items.map((item) => this.toDetalleInput(item)),
        }),
        {
          message: imprimirTicket ? 'Cobrando e imprimiendo…' : 'Cobrando…',
          errorTitle: 'No se pudo registrar la venta',
          notifyError: false,
        },
      )
      .subscribe({
        next: (venta) => {
          this.selling.set(false);
          this.cartActivo().set([]);
          this.refreshSesion();
          this.loadProductos(true);
          if (this.mostrandoOrdenes() || items.some((item) => item.tipo === 'ORDEN')) {
            this.loadOrdenesFinalizadas();
          }
          if (imprimirTicket) {
            this.imprimirTicket(venta);
          }
        },
        error: (err: Error) => {
          this.selling.set(false);
          this.ventaError.set(err.message || 'No se pudo registrar la venta');
        },
      });
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
      pie: 'Gracias por su compra',
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
    return [cliente || 'Sin cliente', vehiculo].filter(Boolean).join(' · ');
  }

  private textoOrden(orden: OrdenTrabajoOutput): string {
    return [
      orden.numero_orden,
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

  private cantidadProductoEnOtroPdv(idProducto: number): number {
    const otro = this.pdvActivo() === 2 ? this.cartPdv1() : this.cartPdv2();
    return otro
      .filter((item) => item.tipo === 'PRODUCTO' && item.idProducto === idProducto)
      .reduce((acc, item) => acc + item.cantidad, 0);
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
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
    };
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
