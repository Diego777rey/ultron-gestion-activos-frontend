import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  OnInit,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EntitySearcherComponent } from '../../../../shared/components/entity-searcher/entity-searcher';
import { UiButtonComponent } from '../../../../shared/components/ui-button/ui-button';
import { NotifyErrorComponent } from '../../../../shared/components/notify-error/notify-error';
import { DataTableComponent } from '../../../../shared/components/data-table/data-table';
import { TableCellDirective } from '../../../../shared/components/data-table/table-cell.directive';
import { PaginatorComponent } from '../../../../shared/components/paginator/paginator';
import { ActionMenuComponent, MenuAction } from '../../../../shared/components/action-menu/action-menu';
import {
  CompraInput,
  CompraOutput,
  ProductoProveedorOutput,
  ProveedorOutput,
  VendedorOutput,
} from '../../../../shared/models/compras.model';
import { TableColumn } from '../../../../shared/models/table-column.model';
import { PageChange } from '../../../../shared/models/pagination.model';
import { AppDialogService } from '../../../../shared/services/app-dialog.service';
import { CompraService } from '../../../../shared/services/compra.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ProveedorService } from '../../../../shared/services/proveedor.service';
import { VendedorService } from '../../../../shared/services/vendedor.service';
import { ProductoService } from '../../../inventario/productos/services/producto.service';
import { ProductoOutput } from '../../../inventario/productos/interfaces/producto.interface';
import { CotizacionService } from '../../../financiero/cotizaciones/services/cotizacion.service';
import { SectorOutput } from '../../../sectores/interfaces/sector.interface';
import { SectorService } from '../../../sectores/services/sector.service';
import { FormaPago } from '../../../ventas/punto-de-venta/interfaces/venta.interface';
import { esGuarani } from '../../../ventas/punto-de-venta/models/monedas';
import { ProveedorFormComponent } from '../../dialogs/proveedor-form/proveedor-form';
import { VendedorFormComponent } from '../../dialogs/vendedor-form/vendedor-form';
import { coincideTexto, contactoVendedor, nombreProveedor, nombreVendedor } from '../../shared/proveedor-presentacion';
import { fechaCorta, formatMonto } from '../../shared/compra-presentacion';
import {
  TipoIva,
  calcularTotales,
  convertirImporte,
  normalizarTipoIva,
  redondear,
  subtotalLinea,
} from '../../shared/compra-calculos';
import {
  FORMAS_PAGO,
  MONEDA_GUARANI_COMPRA,
  MonedaCompra,
  monedaDesdeCotizacion,
} from '../../shared/condiciones-pago';

interface LineaCompra {
  producto: ProductoOutput;
  cantidad: number;
  costo: number;
  tipoIva: TipoIva;
  /** yyyy-MM-dd; vacío si el producto no vence. */
  vencimiento: string;
}

const PAGE_SIZE_PRODUCTOS = 15;
const PAGE_SIZE_SECTORES = 15;
const PAGE_SIZE_LINEAS = 15;

/** Campos de la barra de carga, en el orden en que se recorren con Enter. */
type CampoCarga = 'cantidad' | 'costo' | 'iva' | 'vencimiento';

const ETIQUETAS_IVA: Record<TipoIva, string> = { '10': '10%', '5': '5%', EXENTA: 'Exenta' };

function hoyIso(): string {
  const ahora = new Date();
  const local = new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function numeroDe(texto: string): number {
  return texto.trim() === '' ? Number.NaN : Number(texto);
}

@Component({
  selector: 'app-compra-form',
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    EntitySearcherComponent,
    UiButtonComponent,
    NotifyErrorComponent,
    DataTableComponent,
    TableCellDirective,
    PaginatorComponent,
    ActionMenuComponent,
  ],
  templateUrl: './compra-form.component.html',
  styleUrl: './compra-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompraFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly injector = inject(Injector);
  private readonly compraService = inject(CompraService);
  private readonly proveedorService = inject(ProveedorService);
  private readonly vendedorService = inject(VendedorService);
  private readonly productoService = inject(ProductoService);
  private readonly cotizacionService = inject(CotizacionService);
  private readonly sectorService = inject(SectorService);
  private readonly dialogService = inject(AppDialogService);
  private readonly notifications = inject(NotificationService);

  private readonly productoCampo = viewChild<ElementRef<HTMLElement>>('productoCampo');
  private readonly cantidadInput = viewChild<ElementRef<HTMLInputElement>>('cantidadInput');
  private readonly costoInput = viewChild<ElementRef<HTMLInputElement>>('costoInput');
  private readonly ivaSelect = viewChild<ElementRef<HTMLSelectElement>>('ivaSelect');
  private readonly venceInput = viewChild<ElementRef<HTMLInputElement>>('venceInput');

  protected readonly formasPago = FORMAS_PAGO;
  protected readonly tiposIva: TipoIva[] = ['10', '5', 'EXENTA'];
  protected readonly etiquetaIva = (tipo: TipoIva): string => ETIQUETAS_IVA[tipo];
  protected readonly hoy = hoyIso();
  protected readonly fechaCorta = fechaCorta;

  /** Compra en edición; null al registrar una nueva. */
  protected readonly compraEditada = signal<CompraOutput | null>(null);
  protected readonly esEdicion = computed(() => this.compraEditada() !== null);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

  // ---------- Proveedor y vendedor ----------
  protected readonly proveedores = signal<ProveedorOutput[]>([]);
  protected readonly loadingProveedores = signal(false);
  protected readonly proveedorId = signal<number | null>(null);
  protected readonly proveedor = computed(
    () => this.proveedores().find((p) => Number(p.id_proveedor) === this.proveedorId()) ?? null,
  );
  protected readonly vendedores = signal<VendedorOutput[]>([]);
  protected readonly loadingVendedores = signal(false);
  protected readonly vendedoresActivos = computed(() => this.vendedores().filter((v) => v.activo !== false));
  protected readonly vendedorId = signal<number | null>(null);
  protected readonly vendedor = computed(
    () => this.vendedores().find((v) => Number(v.id_vendedor) === this.vendedorId()) ?? null,
  );
  protected readonly vendedorRequerido = computed(() => this.vendedoresActivos().length > 0);

  protected readonly proveedorColumns: TableColumn<ProveedorOutput>[] = [
    { key: 'nombre', header: 'Proveedor', value: (p) => nombreProveedor(p) },
    { key: 'ruc', header: 'RUC', width: '160px' },
    { key: 'ciudad', header: 'Ciudad', width: '160px' },
  ];
  protected readonly proveedorLabel = (p: ProveedorOutput): string => nombreProveedor(p);
  protected readonly proveedorKey = (p: ProveedorOutput): number => Number(p.id_proveedor);
  protected readonly proveedorSearch = (p: ProveedorOutput, consulta: string): boolean =>
    coincideTexto([nombreProveedor(p), p.nombre_fantasia, p.ruc, p.ciudad, p.telefono], consulta);

  protected readonly vendedorColumns: TableColumn<VendedorOutput>[] = [
    { key: 'nombre', header: 'Vendedor', value: (v) => nombreVendedor(v) },
    { key: 'cargo', header: 'Cargo', width: '180px', value: (v) => v.cargo ?? '' },
    { key: 'contacto', header: 'Contacto', width: '160px', value: (v) => contactoVendedor(v) },
  ];
  protected readonly vendedorLabel = (v: VendedorOutput): string => nombreVendedor(v);
  protected readonly vendedorKey = (v: VendedorOutput): number => Number(v.id_vendedor);
  protected readonly vendedorSearch = (v: VendedorOutput, consulta: string): boolean =>
    coincideTexto([nombreVendedor(v), v.cargo, v.documento, contactoVendedor(v)], consulta);

  // ---------- Sector de ingreso ----------
  protected readonly sectores = signal<SectorOutput[]>([]);
  protected readonly sectoresTotal = signal(0);
  protected readonly sectoresPage = signal(0);
  protected readonly sectoresPageSize = signal(PAGE_SIZE_SECTORES);
  protected readonly loadingSectores = signal(false);
  private sectoresFiltro = '';
  /** Lugar físico donde entra la mercadería al stock. */
  protected readonly sector = signal<SectorOutput | null>(null);
  /** Número, aunque GraphQL entregue el ID como string: si no, el buscador no muestra el nombre. */
  protected readonly sectorId = computed(() => {
    const sector = this.sector();
    return sector ? Number(sector.id_sector) : null;
  });
  /** Al editar, el sector de la compra puede no estar en la página cargada. */
  protected readonly sectoresVisibles = computed(() => {
    const lista = this.sectores().filter((s) => s.estado !== false);
    const actual = this.sector();
    return actual && !lista.some((s) => Number(s.id_sector) === Number(actual.id_sector)) ? [actual, ...lista] : lista;
  });
  protected readonly sectorColumns: TableColumn<SectorOutput>[] = [
    { key: 'nombre', header: 'Sector', value: (s) => s.nombre ?? '' },
    { key: 'descripcion', header: 'Descripción', value: (s) => s.descripcion ?? '' },
  ];
  protected readonly sectorLabel = (s: SectorOutput): string => s.nombre ?? `Sector #${s.id_sector}`;
  protected readonly sectorKey = (s: SectorOutput): number => Number(s.id_sector);

  // ---------- Factura y pago ----------
  protected readonly facturaForm = this.fb.nonNullable.group({
    numeroFactura: ['', Validators.maxLength(100)],
    timbrado: ['', Validators.maxLength(100)],
    fechaFactura: [hoyIso()],
    observaciones: [''],
  });
  protected readonly formaPago = signal<FormaPago>('EFECTIVO');
  protected readonly monedasSistema = signal<MonedaCompra[]>([MONEDA_GUARANI_COMPRA]);
  protected readonly monedaCodigo = signal(MONEDA_GUARANI_COMPRA.codigo);
  /** Al editar se respeta la cotización con la que se registró la compra. */
  protected readonly monedas = computed<MonedaCompra[]>(() => {
    const sistema = this.monedasSistema();
    const compra = this.compraEditada();
    if (!compra || esGuarani(compra.moneda)) {
      return sistema;
    }
    const registrada: MonedaCompra = {
      ...monedaDesdeCotizacion({
        id_cotizacion: 0,
        moneda: compra.moneda,
        valor: Number(compra.cotizacion),
        fechaActualizacion: '',
        activa: true,
      }),
      actualizada: undefined,
    };
    const existe = sistema.some((m) => this.mismaMoneda(m.codigo, compra.moneda));
    return existe
      ? sistema.map((m) => (this.mismaMoneda(m.codigo, compra.moneda) ? registrada : m))
      : [...sistema, registrada];
  });
  protected readonly moneda = computed(
    () => this.monedas().find((m) => this.mismaMoneda(m.codigo, this.monedaCodigo())) ?? MONEDA_GUARANI_COMPRA,
  );
  protected readonly enGuaranies = computed(() => esGuarani(this.moneda().codigo));
  protected readonly decimales = computed(() => (this.enGuaranies() ? 0 : 2));
  protected readonly formatoNumero = computed(() => (this.enGuaranies() ? '1.0-0' : '1.2-2'));
  protected readonly cotizacionRegistrada = computed(() => {
    const compra = this.compraEditada();
    return !!compra && this.mismaMoneda(compra.moneda, this.monedaCodigo()) && !esGuarani(compra.moneda);
  });

  // ---------- Búsqueda de productos ----------
  protected readonly productos = signal<ProductoOutput[]>([]);
  protected readonly productosTotal = signal(0);
  protected readonly productosPage = signal(0);
  protected readonly productosPageSize = signal(PAGE_SIZE_PRODUCTOS);
  protected readonly loadingProductos = signal(false);
  private productosFiltro = '';
  protected readonly productoColumns: TableColumn<ProductoOutput>[] = [
    { key: 'codigo', header: 'Código', width: '140px', value: (p) => p.codigo ?? '' },
    { key: 'nombre', header: 'Producto', value: (p) => p.nombre ?? '' },
    { key: 'stock', header: 'Stock', width: '90px', align: 'right', value: (p) => Number(p.stock ?? 0) },
    {
      key: 'precioCompra',
      header: 'Costo ref.',
      width: '130px',
      align: 'right',
      value: (p) => formatMonto(p.precioCompra ?? 0, 'PYG'),
    },
  ];
  protected readonly productoLabel = (p: ProductoOutput): string => `${p.codigo ?? ''} - ${p.nombre ?? ''}`;
  protected readonly productoKey = (p: ProductoOutput): number => Number(p.id_producto);

  /** Con esta opción el buscador lista solo los productos asociados al proveedor. */
  protected readonly soloDelProveedor = signal(false);
  protected readonly productosProveedor = signal<ProductoProveedorOutput[]>([]);
  protected readonly productosProveedorTotal = signal(0);
  protected readonly productosProveedorPage = signal(0);
  protected readonly productosProveedorPageSize = signal(PAGE_SIZE_PRODUCTOS);
  protected readonly loadingProductosProveedor = signal(false);
  private productosProveedorFiltro = '';
  private productosProveedorPedido = 0;
  private readonly asociando = signal<ReadonlySet<number>>(new Set());
  protected readonly productoProveedorColumns: TableColumn<ProductoProveedorOutput>[] = [
    { key: 'codigo', header: 'Código', width: '140px', value: (pp) => pp.producto_codigo ?? '' },
    { key: 'nombre', header: 'Producto', value: (pp) => pp.producto_nombre ?? '' },
    {
      key: 'ultima',
      header: 'Últ. compra',
      width: '130px',
      value: (pp) => (pp.fecha_ultima_compra ? fechaCorta(pp.fecha_ultima_compra) : '—'),
    },
  ];
  protected readonly productoProveedorLabel = (pp: ProductoProveedorOutput): string =>
    `${pp.producto_codigo ?? ''} - ${pp.producto_nombre ?? ''}`;
  protected readonly productoProveedorKey = (pp: ProductoProveedorOutput): number => Number(pp.id_producto);

  // ---------- Carga de una línea ----------
  protected readonly productoPendiente = signal<ProductoOutput | null>(null);
  protected readonly cargandoPendiente = signal(false);
  /** Índice de la línea que se está modificando; null al agregar una nueva. */
  protected readonly editandoIndex = signal<number | null>(null);
  protected readonly cantidadTexto = signal('1');
  protected readonly costoTexto = signal('');
  protected readonly ivaPendiente = signal<TipoIva>('10');
  protected readonly vencimientoPendiente = signal('');
  protected readonly pendienteVencido = computed(
    () => !!this.vencimientoPendiente() && this.vencimientoPendiente() < this.hoy,
  );
  protected readonly subtotalPendiente = computed(() =>
    subtotalLinea(
      { cantidad: numeroDe(this.cantidadTexto()) || 0, costo: numeroDe(this.costoTexto()) || 0, tipoIva: this.ivaPendiente() },
      this.decimales(),
    ),
  );
  protected readonly puedeAgregar = computed(
    () =>
      this.productoPendiente() !== null &&
      numeroDe(this.cantidadTexto()) > 0 &&
      numeroDe(this.costoTexto()) >= 0 &&
      !this.pendienteVencido(),
  );

  // ---------- Detalle ----------
  protected readonly lineas = signal<LineaCompra[]>([]);
  protected readonly lineasPage = signal(0);
  protected readonly lineasPageSize = signal(PAGE_SIZE_LINEAS);
  protected readonly lineasVisibles = computed(() => {
    const size = Math.max(1, this.lineasPageSize());
    const start = this.lineasPage() * size;
    return this.lineas().slice(start, start + size);
  });
  protected readonly lineasColumns: TableColumn<LineaCompra>[] = [
    { key: 'nro', header: '#', width: '48px', align: 'center' },
    { key: 'codigo', header: 'Código', width: '130px', value: (l) => l.producto.codigo },
    { key: 'producto', header: 'Producto', value: (l) => l.producto.nombre },
    { key: 'stock', header: 'Stock', width: '90px', align: 'right' },
    { key: 'cantidad', header: 'Cant.', width: '80px', align: 'right' },
    { key: 'costo', header: 'Costo unit.', width: '120px', align: 'right' },
    { key: 'iva', header: 'IVA', width: '70px', align: 'center' },
    { key: 'vencimiento', header: 'Vence', width: '105px', align: 'center' },
    { key: 'subtotal', header: 'Subtotal', width: '130px', align: 'right' },
    { key: 'acciones', header: '...', width: '50px', align: 'center' },
  ];
  protected readonly lineaKey = (l: LineaCompra): number => Number(l.producto.id_producto);
  protected readonly unidades = computed(() => this.lineas().reduce((acc, l) => acc + (Number(l.cantidad) || 0), 0));
  protected readonly totales = computed(() => calcularTotales(this.lineas(), this.decimales()));
  protected readonly totalEnGuaranies = computed(() =>
    redondear(this.totales().total * this.moneda().cotizacion, 0),
  );

  // ---------- Validación ----------
  protected readonly pendientes = computed(() => {
    const faltan: string[] = [];
    if (this.proveedorId() === null) {
      faltan.push('Seleccioná el proveedor.');
    } else if (this.vendedorRequerido() && this.vendedorId() === null) {
      faltan.push('Seleccioná el vendedor.');
    }
    if (this.sector() === null) {
      faltan.push('Seleccioná el sector donde ingresa la mercadería.');
    }
    if (this.lineas().length === 0) {
      faltan.push('Agregá al menos un producto.');
    }
    if (this.lineas().some((l) => this.vencido(l))) {
      faltan.push('Hay productos con vencimiento pasado.');
    }
    return faltan;
  });
  protected readonly puedeGuardar = computed(() => this.pendientes().length === 0 && !this.saving());

  ngOnInit(): void {
    this.cargarProveedores();
    this.cargarMonedas();
    this.buscarSectores(0, PAGE_SIZE_SECTORES, '');
    this.buscarProductos(0, PAGE_SIZE_PRODUCTOS, '');

    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id > 0) {
      this.cargarCompra(id);
    }
  }

  // ==================== Proveedor y vendedor ====================

  protected onProveedorChange(valor: unknown): void {
    const id = valor === null || valor === undefined || valor === '' ? null : Number(valor);
    this.seleccionarProveedor(Number.isNaN(id) ? null : id);
  }

  protected onVendedorChange(valor: unknown): void {
    const id = valor === null || valor === undefined || valor === '' ? null : Number(valor);
    this.vendedorId.set(Number.isNaN(id) ? null : id);
  }

  protected nuevoProveedor(): void {
    this.dialogService
      .openForm(ProveedorFormComponent, {
        title: 'Nuevo Proveedor',
        subtitle: 'Completa los datos para registrar un proveedor',
        maxWidth: '760px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.cargarProveedores();
        }
      });
  }

  protected nuevoVendedor(): void {
    const idProveedor = this.proveedorId();
    if (idProveedor === null) return;
    const anteriores = new Set(this.vendedores().map((v) => Number(v.id_vendedor)));
    this.dialogService
      .openForm(VendedorFormComponent, {
        title: 'Nuevo Vendedor',
        subtitle: 'Registrá un vendedor para este proveedor',
        maxWidth: '760px',
        inputs: { proveedorInicial: idProveedor },
      })
      .subscribe((saved) => {
        if (saved) {
          this.cargarVendedores(idProveedor, anteriores);
        }
      });
  }

  // ==================== Sector de ingreso ====================

  protected buscarSectores(page: number, size: number, filtro: string): void {
    this.sectoresFiltro = filtro;
    this.sectoresPage.set(page);
    this.loadingSectores.set(true);
    this.sectorService.findPaginated(page, size, filtro).subscribe({
      next: (res) => {
        this.sectores.set(res.content);
        this.sectoresTotal.set(res.pageInfo.totalElements);
        this.loadingSectores.set(false);
        const activos = res.content.filter((s) => s.estado !== false);
        if (!this.esEdicion() && this.sector() === null && filtro === '' && res.pageInfo.totalElements === 1 && activos.length === 1) {
          this.fijarSector(activos[0]);
        }
      },
      error: () => {
        this.loadingSectores.set(false);
        this.error.set('No se pudieron cargar los sectores');
      },
    });
  }

  protected onSectoresPage(event: PageChange): void {
    this.sectoresPageSize.set(event.pageSize);
    this.buscarSectores(event.pageIndex, event.pageSize, this.sectoresFiltro);
  }

  protected onSectorSeleccionado(sector: SectorOutput | null): void {
    this.fijarSector(sector);
  }

  private fijarSector(sector: SectorOutput | null): void {
    if (!sector) {
      this.sector.set(null);
      return;
    }
    this.sector.set({ ...sector, id_sector: Number(sector.id_sector) });
  }

  // ==================== Factura y pago ====================

  protected onFormaPagoChange(valor: string): void {
    const forma = FORMAS_PAGO.find((f) => f.codigo === valor);
    if (forma) this.formaPago.set(forma.codigo);
  }

  /** Los costos cargados se pasan a la nueva moneda con las cotizaciones del sistema. */
  protected onMonedaChange(codigo: string): void {
    const anterior = this.moneda();
    if (this.mismaMoneda(anterior.codigo, codigo)) return;
    this.monedaCodigo.set(codigo);
    const nueva = this.moneda();
    const decimales = this.decimales();
    const convertir = (valor: number) => convertirImporte(valor, anterior.cotizacion, nueva.cotizacion, decimales);
    this.lineas.update((lineas) => lineas.map((l) => ({ ...l, costo: convertir(l.costo) })));
    const costo = numeroDe(this.costoTexto());
    if (costo >= 0) {
      this.costoTexto.set(String(convertir(costo)));
    }
  }

  // ==================== Búsqueda y carga de productos ====================

  protected buscarProductos(page: number, size: number, filtro: string): void {
    this.productosFiltro = filtro;
    this.productosPage.set(page);
    this.productosPageSize.set(size);
    this.loadingProductos.set(true);
    this.productoService.findPaginated(page, size, filtro).subscribe({
      next: (res) => {
        this.productos.set(res.content);
        this.productosTotal.set(res.pageInfo.totalElements);
        this.loadingProductos.set(false);
      },
      error: () => this.loadingProductos.set(false),
    });
  }

  protected onProductosPage(event: PageChange): void {
    this.buscarProductos(event.pageIndex, event.pageSize, this.productosFiltro);
  }

  protected buscarProductosProveedor(page: number, size: number, filtro: string): void {
    const idProveedor = this.proveedorId();
    if (idProveedor === null) return;
    this.productosProveedorFiltro = filtro;
    this.productosProveedorPage.set(page);
    this.productosProveedorPageSize.set(size);
    this.loadingProductosProveedor.set(true);
    const pedido = ++this.productosProveedorPedido;
    this.compraService.productosDeProveedorPaginado(idProveedor, page, size, filtro).subscribe({
      next: (res) => {
        if (pedido !== this.productosProveedorPedido || this.proveedorId() !== idProveedor) return;
        this.productosProveedor.set(res?.content ?? []);
        this.productosProveedorTotal.set(res?.pageInfo?.totalElements ?? 0);
        this.loadingProductosProveedor.set(false);
      },
      error: () => {
        if (pedido !== this.productosProveedorPedido) return;
        this.loadingProductosProveedor.set(false);
      },
    });
  }

  protected onProductosProveedorPage(event: PageChange): void {
    this.buscarProductosProveedor(event.pageIndex, event.pageSize, this.productosProveedorFiltro);
  }

  protected onSoloDelProveedorChange(valor: boolean): void {
    this.soloDelProveedor.set(valor);
  }

  protected onProductoSeleccionado(producto: ProductoOutput | null): void {
    if (producto) {
      this.prepararLinea(producto);
    }
  }

  /** Los productos del proveedor no traen stock ni IVA: se consulta el producto antes de cargarlo. */
  protected onProductoProveedorSeleccionado(pp: ProductoProveedorOutput | null): void {
    if (!pp) return;
    this.cargandoPendiente.set(true);
    this.productoService.findById(pp.id_producto).subscribe({
      next: (producto) => {
        this.cargandoPendiente.set(false);
        if (producto) {
          this.prepararLinea(producto);
        }
      },
      error: () => {
        this.cargandoPendiente.set(false);
        this.error.set('No se pudo cargar el producto');
      },
    });
  }

  /** Enter pasa al campo siguiente si el actual es válido; en el último confirma la línea. */
  protected onEnterCampo(event: Event, campo: CampoCarga): void {
    event.preventDefault();
    switch (campo) {
      case 'cantidad':
        if (numeroDe(this.cantidadTexto()) > 0) this.enfocar(this.costoInput());
        break;
      case 'costo':
        if (numeroDe(this.costoTexto()) >= 0) this.enfocar(this.ivaSelect());
        break;
      case 'iva':
        this.enfocar(this.venceInput());
        break;
      case 'vencimiento':
        this.vencimientoPendiente.set((event.target as HTMLInputElement).value);
        this.confirmarLinea();
        break;
    }
  }

  protected confirmarLinea(): void {
    const producto = this.productoPendiente();
    if (!producto) return;
    if (!this.puedeAgregar()) {
      this.enfocar(this.primerCampoInvalido());
      return;
    }
    const linea: LineaCompra = {
      producto,
      cantidad: redondear(numeroDe(this.cantidadTexto()), 3),
      costo: redondear(numeroDe(this.costoTexto()), this.decimales()),
      tipoIva: this.ivaPendiente(),
      vencimiento: this.vencimientoPendiente(),
    };
    const index = this.editandoIndex();
    if (index !== null) {
      this.lineas.update((lineas) => lineas.map((l, i) => (i === index ? linea : l)));
      this.mostrarLinea(index);
    } else {
      this.lineas.update((lineas) => [...lineas, linea]);
      this.mostrarLinea(this.lineas().length - 1);
    }
    this.asociarAlProveedor(producto);
    this.limpiarLinea();
    this.enfocarDespuesDeRender(() => this.productoCampo()?.nativeElement.querySelector('input'));
  }

  protected limpiarLinea(): void {
    this.productoPendiente.set(null);
    this.editandoIndex.set(null);
    this.cantidadTexto.set('1');
    this.costoTexto.set('');
    this.ivaPendiente.set('10');
    this.vencimientoPendiente.set('');
  }

  // ==================== Detalle ====================

  protected onLineaClick(linea: LineaCompra): void {
    this.editarLinea(this.indiceDe(linea));
  }

  protected accionesLinea(_linea: LineaCompra): MenuAction[] {
    return [
      { id: 'editar', label: 'Modificar', icon: 'edit' },
      { id: 'quitar', label: 'Quitar de la compra', icon: 'delete', danger: true },
    ];
  }

  protected onAccionLinea(accion: string, linea: LineaCompra): void {
    const index = this.indiceDe(linea);
    switch (accion) {
      case 'editar':
        this.editarLinea(index);
        break;
      case 'quitar':
        this.lineas.update((lineas) => lineas.filter((_, i) => i !== index));
        this.ajustarPaginaLineas();
        if (this.editandoIndex() === index) {
          this.limpiarLinea();
        }
        break;
    }
  }

  protected indiceDe(linea: LineaCompra): number {
    return this.lineas().findIndex((l) => Number(l.producto.id_producto) === Number(linea.producto.id_producto));
  }

  protected numeroLinea(indexEnPagina: number): number {
    return this.lineasPage() * this.lineasPageSize() + indexEnPagina + 1;
  }

  protected editandoEstaFila(indexEnPagina: number): boolean {
    return this.editandoIndex() === this.lineasPage() * this.lineasPageSize() + indexEnPagina;
  }

  protected onLineasPage(event: PageChange): void {
    this.lineasPageSize.set(event.pageSize);
    const max = Math.max(0, Math.ceil(this.lineas().length / Math.max(1, event.pageSize)) - 1);
    this.lineasPage.set(Math.min(event.pageIndex, max));
  }

  protected subtotal(linea: LineaCompra): number {
    return subtotalLinea(linea, this.decimales());
  }

  protected stockBajo(producto: ProductoOutput): boolean {
    const minimo = Number(producto.stockMinimo ?? 0);
    return minimo > 0 && Number(producto.stock ?? 0) <= minimo;
  }

  protected vencido(linea: LineaCompra): boolean {
    return !!linea.vencimiento && linea.vencimiento < this.hoy;
  }

  protected monto(valor: number): string {
    return formatMonto(valor, this.moneda().codigo);
  }

  // ==================== Guardar ====================

  protected cancelar(): void {
    void this.router.navigate(['/compras']);
  }

  protected guardar(): void {
    this.error.set(null);
    const idProveedor = this.proveedorId();
    if (!this.puedeGuardar() || idProveedor === null) {
      return;
    }
    const datos = this.facturaForm.getRawValue();
    const moneda = this.moneda();
    const compra = this.compraEditada();
    const input: CompraInput = {
      idProveedor,
      idVendedor: this.vendedorId() ?? undefined,
      numeroFactura: datos.numeroFactura.trim() || undefined,
      timbrado: datos.timbrado.trim() || undefined,
      fechaFactura: datos.fechaFactura || undefined,
      formaPago: this.formaPago(),
      moneda: moneda.codigo,
      cotizacion: moneda.cotizacion,
      idSector: this.sector()?.id_sector,
      estado: compra?.estado ?? 'RECIBIDA',
      observaciones: datos.observaciones.trim() || undefined,
      items: this.lineas().map((l) => ({
        idProducto: Number(l.producto.id_producto),
        cantidad: Number(l.cantidad),
        precioCosto: Number(l.costo),
        tipoIva: l.tipoIva,
        fechaVencimiento: l.vencimiento || undefined,
      })),
    };

    this.saving.set(true);
    const request = compra
      ? this.compraService.update(compra.id_compra, input)
      : this.compraService.create(input);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigate(['/compras']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar la compra');
      },
    });
  }

  // ==================== Carga de datos ====================

  private seleccionarProveedor(id: number | null, idVendedor: number | null = null): void {
    if (id === this.proveedorId() && idVendedor === null) return;
    this.proveedorId.set(id);
    this.vendedorId.set(idVendedor);
    this.vendedores.set([]);
    this.productosProveedor.set([]);
    this.productosProveedorTotal.set(0);
    this.productosProveedorPage.set(0);
    this.productosProveedorFiltro = '';
    if (id === null) {
      this.soloDelProveedor.set(false);
      return;
    }
    this.cargarVendedores(id);
    this.cargarProductosProveedor(id);
  }

  private cargarProveedores(): void {
    this.loadingProveedores.set(true);
    this.proveedorService.findAll().subscribe({
      next: (lista) => {
        this.proveedores.set(lista.filter((p) => p.activo || Number(p.id_proveedor) === this.proveedorId()));
        this.loadingProveedores.set(false);
      },
      error: () => {
        this.loadingProveedores.set(false);
        this.error.set('No se pudieron cargar los proveedores');
      },
    });
  }

  /**
   * Con un solo vendedor activo se selecciona solo. Si se acaba de crear uno
   * (`anteriores` = ids previos), se selecciona el nuevo.
   */
  private cargarVendedores(idProveedor: number, anteriores?: ReadonlySet<number>): void {
    this.loadingVendedores.set(true);
    this.vendedorService.listarVendedoresPorProveedor(idProveedor).subscribe({
      next: (lista) => {
        if (this.proveedorId() !== idProveedor) return;
        this.vendedores.set(lista);
        this.loadingVendedores.set(false);
        const activos = lista.filter((v) => v.activo !== false);
        const nuevo = anteriores ? activos.find((v) => !anteriores.has(Number(v.id_vendedor))) : undefined;
        if (nuevo) {
          this.vendedorId.set(Number(nuevo.id_vendedor));
        } else if (this.vendedorId() === null && activos.length === 1) {
          this.vendedorId.set(Number(activos[0].id_vendedor));
        }
      },
      error: () => {
        this.loadingVendedores.set(false);
        this.error.set('No se pudieron cargar los vendedores del proveedor');
      },
    });
  }

  private cargarProductosProveedor(idProveedor: number): void {
    if (this.proveedorId() !== idProveedor) return;
    this.buscarProductosProveedor(0, this.productosProveedorPageSize(), '');
  }

  private cargarMonedas(): void {
    this.cotizacionService.listarCotizacionesActivas().subscribe({
      next: (cotizaciones) =>
        this.monedasSistema.set([
          MONEDA_GUARANI_COMPRA,
          ...cotizaciones.filter((c) => !esGuarani(c.moneda)).map(monedaDesdeCotizacion),
        ]),
      error: () => this.error.set('No se pudieron cargar las cotizaciones del sistema'),
    });
  }

  private cargarCompra(id: number): void {
    this.compraService.findConItems(id).subscribe({
      next: (compra) => {
        if (!compra) {
          this.error.set('No se encontró la compra');
          return;
        }
        this.compraEditada.set(compra);
        this.fijarSector(
          compra.id_sector ? { id_sector: Number(compra.id_sector), nombre: compra.sector_nombre ?? '' } : null,
        );
        this.seleccionarProveedor(Number(compra.id_proveedor), compra.id_vendedor ? Number(compra.id_vendedor) : null);
        this.facturaForm.reset({
          numeroFactura: compra.numero_factura ?? '',
          timbrado: compra.timbrado ?? '',
          fechaFactura: compra.fecha_factura?.slice(0, 10) ?? '',
          observaciones: compra.observaciones ?? '',
        });
        this.onFormaPagoChange(compra.forma_pago?.toUpperCase() ?? '');
        this.monedaCodigo.set(compra.moneda || MONEDA_GUARANI_COMPRA.codigo);
        this.cargarLineas(compra);
      },
      error: (err: Error) => this.error.set(err.message || 'No se pudo cargar la compra'),
    });
  }

  private cargarLineas(compra: CompraOutput): void {
    const items = compra.items ?? [];
    if (items.length === 0) return;
    forkJoin(
      items.map((item) =>
        this.productoService.findById(item.id_producto).pipe(
          catchError(() => of(null)),
          map((producto): LineaCompra => ({
            producto: producto ?? {
              id_producto: Number(item.id_producto),
              codigo: item.producto_codigo ?? '',
              nombre: item.producto_nombre ?? '',
              precioVenta: 0,
              stock: 0,
              stockMinimo: 0,
            },
            cantidad: Number(item.cantidad),
            costo: Number(item.precio_costo),
            tipoIva: normalizarTipoIva(item.tipo_iva),
            vencimiento: item.fecha_vencimiento?.slice(0, 10) ?? '',
          })),
        ),
      ),
    ).subscribe((lineas) => {
      this.lineas.set(lineas);
      this.lineasPage.set(0);
    });
  }

  // ==================== Helpers ====================

  /** Si el producto ya está en la compra se abre su línea para modificarla en lugar de duplicarla. */
  private prepararLinea(producto: ProductoOutput): void {
    const existente = this.lineas().findIndex((l) => Number(l.producto.id_producto) === Number(producto.id_producto));
    if (existente >= 0) {
      this.editarLinea(existente);
      this.notifications.info(`${producto.nombre} ya está en la compra: modificá su cantidad o costo.`);
      return;
    }
    this.editandoIndex.set(null);
    this.productoPendiente.set(producto);
    this.cantidadTexto.set('1');
    this.costoTexto.set(
      String(convertirImporte(Number(producto.precioCompra ?? 0), 1, this.moneda().cotizacion, this.decimales())),
    );
    this.ivaPendiente.set(normalizarTipoIva(producto.tipoIva));
    this.vencimientoPendiente.set('');
    this.enfocarCantidad();
  }

  private editarLinea(index: number): void {
    const linea = this.lineas()[index];
    if (!linea) return;
    this.editandoIndex.set(index);
    this.productoPendiente.set(linea.producto);
    this.cantidadTexto.set(String(linea.cantidad));
    this.costoTexto.set(String(linea.costo));
    this.ivaPendiente.set(linea.tipoIva);
    this.vencimientoPendiente.set(linea.vencimiento);
    this.mostrarLinea(index);
    this.enfocarCantidad();
  }

  /** Al confirmar la línea el producto queda ligado al proveedor, sin un paso aparte. */
  private asociarAlProveedor(producto: ProductoOutput): void {
    const idProveedor = this.proveedorId();
    const idProducto = Number(producto.id_producto);
    if (
      idProveedor === null ||
      this.productosProveedor().some((pp) => Number(pp.id_producto) === idProducto) ||
      this.asociando().has(idProducto)
    ) {
      return;
    }
    this.asociando.update((s) => new Set(s).add(idProducto));
    this.compraService.asociarProductoProveedor(idProducto, idProveedor).subscribe({
      next: () => {
        this.asociando.update((s) => {
          const copia = new Set(s);
          copia.delete(idProducto);
          return copia;
        });
        if (this.proveedorId() !== idProveedor) return;
        this.buscarProductosProveedor(
          this.productosProveedorPage(),
          this.productosProveedorPageSize(),
          this.productosProveedorFiltro,
        );
      },
      error: (err: Error) => {
        this.asociando.update((s) => {
          const copia = new Set(s);
          copia.delete(idProducto);
          return copia;
        });
        this.error.set(err.message || 'No se pudo asociar el producto al proveedor');
      },
    });
  }

  private mostrarLinea(index: number): void {
    const size = Math.max(1, this.lineasPageSize());
    this.lineasPage.set(Math.floor(Math.max(0, index) / size));
  }

  private ajustarPaginaLineas(): void {
    const size = Math.max(1, this.lineasPageSize());
    const max = Math.max(0, Math.ceil(this.lineas().length / size) - 1);
    if (this.lineasPage() > max) this.lineasPage.set(max);
  }

  private enfocarCantidad(): void {
    this.enfocarDespuesDeRender(() => this.cantidadInput()?.nativeElement);
  }

  private primerCampoInvalido(): ElementRef<HTMLInputElement> | undefined {
    if (!(numeroDe(this.cantidadTexto()) > 0)) return this.cantidadInput();
    if (!(numeroDe(this.costoTexto()) >= 0)) return this.costoInput();
    return this.pendienteVencido() ? this.venceInput() : undefined;
  }

  private enfocar(ref: ElementRef<HTMLInputElement | HTMLSelectElement> | undefined): void {
    const elemento = ref?.nativeElement;
    elemento?.focus();
    if (elemento instanceof HTMLInputElement) elemento.select();
  }

  /** Para campos que se habilitan o limpian en el mismo cambio que pide el foco. */
  private enfocarDespuesDeRender(elemento: () => HTMLElement | null | undefined): void {
    afterNextRender(
      () => {
        const el = elemento();
        el?.focus();
        if (el instanceof HTMLInputElement) el.select();
      },
      { injector: this.injector },
    );
  }

  private mismaMoneda(a: string | null | undefined, b: string | null | undefined): boolean {
    return (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase();
  }
}
