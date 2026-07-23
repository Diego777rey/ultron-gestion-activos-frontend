import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { SectorService } from '../../../../sectores/services/sector.service';
import { SectorOutput } from '../../../../sectores/interfaces/sector.interface';
import { ProductoService } from '../../../../inventario/productos/services/producto.service';
import { ProductoOutput } from '../../../../inventario/productos/interfaces/producto.interface';
import { SolicitudRepuestoService } from '../../services/solicitud-repuesto.service';
import {
  SolicitudRepuestoInput,
  SolicitudRepuestoOutput,
} from '../../interfaces/solicitud-repuesto.interface';

@Component({
  selector: 'app-ot-solicitud-repuesto',
  imports: [ReactiveFormsModule, UiButtonComponent, EntitySearcherComponent, DatePipe],
  templateUrl: './ot-solicitud-repuesto.component.html',
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtSolicitudRepuestoComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly solicitudService = inject(SolicitudRepuestoService);
  private readonly sectorService = inject(SectorService);
  private readonly productoService = inject(ProductoService);

  readonly idOrden = input.required<string>();
  readonly editable = input(true);
  readonly errorChange = output<string>();

  protected readonly solicitudes = signal<SolicitudRepuestoOutput[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    id_sector_origen: ['', Validators.required],
    observacion: [''],
    id_producto: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(0.01)]],
  });

  protected readonly pendientes = signal<
    { id_producto: string; nombre: string; cantidad: number }[]
  >([]);

  protected readonly sectores = signal<SectorOutput[]>([]);
  protected readonly sectoresTotal = signal(0);
  protected readonly loadingSectores = signal(false);
  protected readonly sectorColumns: TableColumn<SectorOutput>[] = [
    { key: 'nombre', header: 'Sector', value: (s) => s.nombre ?? '' },
  ];
  protected readonly sectorLabelFn = (s: SectorOutput) => s.nombre ?? '';
  protected readonly sectorKeyFn = (s: SectorOutput) => String(s.id_sector);

  protected readonly productos = signal<ProductoOutput[]>([]);
  protected readonly productosTotal = signal(0);
  protected readonly loadingProductos = signal(false);
  protected readonly productoColumns: TableColumn<ProductoOutput>[] = [
    { key: 'codigo', header: 'Código', value: (p) => p.codigo ?? '' },
    { key: 'nombre', header: 'Producto', value: (p) => p.nombre ?? '' },
  ];
  protected readonly productoLabelFn = (p: ProductoOutput) => `${p.codigo ?? ''} - ${p.nombre ?? ''}`;
  protected readonly productoKeyFn = (p: ProductoOutput) => String(p.id_producto);

  private selectedProductoNombre = '';

  ngOnInit(): void {
    this.cargar();
    this.fetchSectores(0, 10, '');
    this.fetchProductos(0, 10, '');
  }

  protected cargar(): void {
    this.loading.set(true);
    this.solicitudService.listarPorOrden(this.idOrden()).subscribe({
      next: (list) => {
        this.solicitudes.set(list);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorChange.emit(err?.message ?? 'No se pudieron cargar las solicitudes');
        this.loading.set(false);
      },
    });
  }

  protected fetchSectores(page: number, size: number, filter: string): void {
    this.loadingSectores.set(true);
    this.sectorService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.sectores.set(res.content);
        this.sectoresTotal.set(res.pageInfo.totalElements);
        this.loadingSectores.set(false);
      },
      error: () => this.loadingSectores.set(false),
    });
  }

  protected fetchProductos(page: number, size: number, filter: string): void {
    this.loadingProductos.set(true);
    this.productoService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.productos.set(res.content);
        this.productosTotal.set(res.pageInfo.totalElements);
        this.loadingProductos.set(false);
      },
      error: () => this.loadingProductos.set(false),
    });
  }

  protected onSectorSelected(sector: SectorOutput | null): void {
    this.form.controls.id_sector_origen.setValue(
      sector?.id_sector != null ? String(sector.id_sector) : ''
    );
  }

  protected onProductoSelected(producto: ProductoOutput | null): void {
    this.form.controls.id_producto.setValue(
      producto?.id_producto != null ? String(producto.id_producto) : ''
    );
    this.selectedProductoNombre = producto
      ? `${producto.codigo ?? ''} - ${producto.nombre ?? ''}`
      : '';
  }

  protected agregarLinea(): void {
    const idProducto = this.form.controls.id_producto.value;
    const cantidad = Number(this.form.controls.cantidad.value);
    if (!idProducto || !cantidad || cantidad <= 0) {
      this.form.controls.id_producto.markAsTouched();
      this.form.controls.cantidad.markAsTouched();
      return;
    }
    this.pendientes.update((list) => [
      ...list,
      { id_producto: idProducto, nombre: this.selectedProductoNombre || idProducto, cantidad },
    ]);
    this.form.patchValue({ id_producto: '', cantidad: 1 });
    this.selectedProductoNombre = '';
  }

  protected quitarLinea(index: number): void {
    this.pendientes.update((list) => list.filter((_, i) => i !== index));
  }

  protected crearSolicitud(): void {
    if (this.form.controls.id_sector_origen.invalid || this.pendientes().length === 0) {
      this.form.controls.id_sector_origen.markAsTouched();
      this.errorChange.emit('Indica sector origen y al menos un producto');
      return;
    }
    const input: SolicitudRepuestoInput = {
      id_sector_origen: this.form.controls.id_sector_origen.value!,
      observacion: this.form.controls.observacion.value,
      detalles: this.pendientes().map((p) => ({
        id_producto: p.id_producto,
        cantidad: p.cantidad,
      })),
    };
    this.saving.set(true);
    this.solicitudService.crear(this.idOrden(), input).subscribe({
      next: () => {
        this.pendientes.set([]);
        this.form.patchValue({ observacion: '' });
        this.saving.set(false);
        this.cargar();
      },
      error: (err) => {
        this.errorChange.emit(err?.message ?? 'No se pudo crear la solicitud');
        this.saving.set(false);
      },
    });
  }

  protected aprobar(sol: SolicitudRepuestoOutput): void {
    if (!sol.id_solicitud_repuesto) return;
    this.solicitudService.aprobar(sol.id_solicitud_repuesto).subscribe({
      next: () => this.cargar(),
      error: (err) => this.errorChange.emit(err?.message ?? 'No se pudo aprobar'),
    });
  }

  protected rechazar(sol: SolicitudRepuestoOutput): void {
    if (!sol.id_solicitud_repuesto) return;
    const motivo = prompt('Motivo del rechazo:');
    if (!motivo?.trim()) return;
    this.solicitudService.rechazar(sol.id_solicitud_repuesto, motivo.trim()).subscribe({
      next: () => this.cargar(),
      error: (err) => this.errorChange.emit(err?.message ?? 'No se pudo rechazar'),
    });
  }
}
