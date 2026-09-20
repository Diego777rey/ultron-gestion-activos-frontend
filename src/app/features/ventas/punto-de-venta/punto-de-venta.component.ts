import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ModalComponent } from '../../../shared/components/modal/modal';
import { UiButtonComponent } from '../../../shared/components/ui-button/ui-button';
import { TabService } from '../../../shared/services/tab.service';
import { ProductoService } from '../../inventario/productos/services/producto.service';
import { ProductoOutput } from '../../inventario/productos/interfaces/producto.interface';
import { OrdenTrabajoService } from '../../taller/orden-de-trabajo/services/orden-trabajo.service';
import { OrdenTrabajoOutput } from '../../taller/orden-de-trabajo/interfaces/orden-trabajo.interface';
import { AbrirCajaDialogComponent } from './dialogs/abrir-caja-dialog/abrir-caja-dialog.component';
import { SesionCajaService } from './services/sesion-caja.service';
import { VentaPosService } from './services/venta.service';
import { SesionCajaOutput } from './interfaces/sesion-caja.interface';
import { CartItem, DetalleVentaInput } from './interfaces/venta.interface';

const POS_ROUTE = '/ventas/punto-de-venta';

export type CatalogoPos = 'productos' | 'ordenes';

@Component({
  selector: 'app-punto-de-venta',
  imports: [ModalComponent, AbrirCajaDialogComponent, UiButtonComponent, DecimalPipe],
  templateUrl: './punto-de-venta.component.html',
  styleUrl: './punto-de-venta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class PuntoDeVentaComponent {
  private readonly tabService = inject(TabService);
  private readonly router = inject(Router);
  private readonly sesionCajaService = inject(SesionCajaService);
  private readonly ventaService = inject(VentaPosService);
  private readonly productoService = inject(ProductoService);
  private readonly ordenTrabajoService = inject(OrdenTrabajoService);

  readonly inicioDialogOpen = signal(true);
  readonly gestionCajaOpen = signal(false);
  readonly maletinVerificado = signal(false);
  readonly cajaAbierta = signal(false);
  readonly sesion = signal<SesionCajaOutput | null>(null);
  readonly loadingSesion = signal(true);

  readonly catalogo = signal<CatalogoPos>('productos');
  readonly productos = signal<ProductoOutput[]>([]);
  readonly ordenesFinalizadas = signal<OrdenTrabajoOutput[]>([]);
  readonly loadingOrdenes = signal(false);
  readonly search = signal('');
  readonly cart = signal<CartItem[]>([]);
  readonly selling = signal(false);
  readonly ventaError = signal<string | null>(null);
  readonly lastVentaNumero = signal<string | null>(null);

  readonly pasoInicialGestion = computed(() => {
    if (!this.maletinVerificado()) {
      return 1;
    }
    if (this.cajaAbierta()) {
      return 3;
    }
    return 2;
  });

  readonly mostrandoOrdenes = computed(() => this.catalogo() === 'ordenes');

  readonly productosFiltrados = computed(() => {
    const q = this.search().trim().toLowerCase();
    const items = this.productos().filter((p) => p.estado !== false);
    if (!q) {
      return items;
    }
    return items.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        (p.codigoBarras ?? '').toLowerCase().includes(q) ||
        (p.categoriaProducto?.nombre ?? '').toLowerCase().includes(q)
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
    this.loadProductos();
  }

  onCajaCerrada(): void {
    this.sesion.set(null);
    this.cajaAbierta.set(false);
    this.maletinVerificado.set(false);
    this.cart.set([]);
    this.catalogo.set('productos');
    this.ordenesFinalizadas.set([]);
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
  }

  protected mostrarProductos(): void {
    this.catalogo.set('productos');
    this.search.set('');
    this.ventaError.set(null);
  }

  protected mostrarOrdenesFinalizadas(): void {
    this.catalogo.set('ordenes');
    this.search.set('');
    this.ventaError.set(null);
    this.loadOrdenesFinalizadas();
  }

  protected addProducto(producto: ProductoOutput): void {
    const stock = Number(producto.stock ?? 0);
    if (stock <= 0) {
      this.ventaError.set(`Sin stock: ${producto.nombre}`);
      return;
    }

    this.ventaError.set(null);
    this.cart.update((items) => {
      const idx = items.findIndex(
        (i) => i.tipo === 'PRODUCTO' && i.idProducto === producto.id_producto
      );
      if (idx >= 0) {
        const current = items[idx];
        const nuevaCantidad = current.cantidad + 1;
        if (nuevaCantidad > stock) {
          this.ventaError.set(`Stock insuficiente para ${producto.nombre}`);
          return items;
        }
        const next = [...items];
        next[idx] = { ...current, cantidad: nuevaCantidad };
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
          stockDisponible: stock,
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
    if (this.cart().some((item) => item.tipo === 'ORDEN' && item.idOrdenTrabajo === idOrden)) {
      this.ventaError.set(`La orden ${orden.numero_orden ?? idOrden} ya está en el carrito`);
      return;
    }

    const total = this.totalOrden(orden);
    if (total <= 0) {
      this.ventaError.set(`La orden ${orden.numero_orden ?? idOrden} no tiene un monto para cobrar`);
      return;
    }

    this.ventaError.set(null);
    this.cart.update((items) => [
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
    this.cart.update((items) => {
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
      if (cantidad > item.stockDisponible) {
        this.ventaError.set(`Stock insuficiente para ${item.nombre}`);
        return items;
      }
      next[index] = { ...item, cantidad };
      return next;
    });
  }

  protected removeItem(index: number): void {
    this.cart.update((items) => items.filter((_, i) => i !== index));
  }

  protected clearCart(): void {
    this.cart.set([]);
    this.ventaError.set(null);
  }

  protected cobrar(): void {
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
    this.ventaService
      .registrarVenta({
        idSesionCaja: sesion.id_sesion_caja,
        idCliente: ordenCliente?.idCliente ?? null,
        descuento: 0,
        detalles: items.map((item) => this.toDetalleInput(item)),
      })
      .subscribe({
        next: (venta) => {
          this.selling.set(false);
          this.lastVentaNumero.set(venta.numero);
          this.cart.set([]);
          this.refreshSesion();
          this.loadProductos();
          if (this.mostrandoOrdenes() || items.some((item) => item.tipo === 'ORDEN')) {
            this.loadOrdenesFinalizadas();
          }
        },
        error: (err: Error) => {
          this.selling.set(false);
          this.ventaError.set(err.message || 'No se pudo registrar la venta');
        },
      });
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

  private toDetalleInput(item: CartItem): DetalleVentaInput {
    if (item.tipo === 'ORDEN') {
      return {
        idOrdenTrabajo: item.idOrdenTrabajo,
        descripcion: item.nombre,
        cantidad: 1,
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
          this.loadProductos();
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

  private loadProductos(): void {
    this.productoService.findAll(true).subscribe({
      next: (items) => this.productos.set(items),
      error: (err: Error) => this.ventaError.set(err.message || 'No se pudieron cargar productos'),
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
