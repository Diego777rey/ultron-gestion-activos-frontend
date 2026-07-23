import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { ProductoService } from '../../../../inventario/productos/services/producto.service';
import { ProductoOutput } from '../../../../inventario/productos/interfaces/producto.interface';
import { ServicioService } from '../../../../inventario/servicios/services/servicio.service';
import { ServicioOutput } from '../../../../inventario/servicios/interfaces/servicio.interface';
import { ServicioFormComponent } from '../../../../inventario/servicios/dialogs/servicio-form/servicio-form.component';
import {
  OrdenTrabajoDetalleInput,
  OrdenTrabajoDetalleOutput,
  OrdenTrabajoOutput,
} from '../../interfaces/orden-trabajo.interface';
import { OrdenTrabajoService } from '../../services/orden-trabajo.service';

@Component({
  selector: 'app-ot-detalle-lineas',
  imports: [CurrencyPipe, ReactiveFormsModule, UiButtonComponent, EntitySearcherComponent],
  templateUrl: './ot-detalle-lineas.component.html',
  styleUrl: '../../styles/ot-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OtDetalleLineasComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogService = inject(AppDialogService);
  private readonly ordenService = inject(OrdenTrabajoService);
  private readonly productoService = inject(ProductoService);
  private readonly servicioService = inject(ServicioService);

  readonly orden = input.required<OrdenTrabajoOutput>();
  readonly editable = input(true);
  readonly allowCreateServicio = input(true);
  readonly ordenChange = output<OrdenTrabajoOutput>();
  readonly errorChange = output<string>();

  protected readonly detalleTipos = [
    { value: 'PRODUCTO', label: 'Producto (Repuesto)' },
    { value: 'SERVICIO', label: 'Servicio (Mano de obra)' },
  ];

  protected readonly detalleForm = this.fb.group({
    tipo: ['PRODUCTO', Validators.required],
    id_item: ['', Validators.required],
    cantidad: [1, [Validators.required, Validators.min(0.01)]],
    precio_unitario: [0, [Validators.required, Validators.min(0)]],
    descripcion: [''],
  });

  protected readonly isAdding = signal(false);

  protected readonly productos = signal<ProductoOutput[]>([]);
  protected readonly productosTotal = signal(0);
  protected readonly loadingProductos = signal(false);
  protected readonly productoColumns: TableColumn<ProductoOutput>[] = [
    { key: 'codigo', header: 'Código', value: (p) => p.codigo ?? '' },
    { key: 'nombre', header: 'Producto', value: (p) => p.nombre ?? '' },
    { key: 'precio', header: 'Precio', value: (p) => String(p.precioVenta ?? 0) },
  ];

  protected readonly servicios = signal<ServicioOutput[]>([]);
  protected readonly serviciosTotal = signal(0);
  protected readonly loadingServicios = signal(false);
  protected readonly servicioColumns: TableColumn<ServicioOutput>[] = [
    { key: 'codigo', header: 'Código', value: (s) => s.codigo ?? '' },
    { key: 'nombre', header: 'Servicio', value: (s) => s.nombre ?? '' },
    { key: 'precio', header: 'Precio', value: (s) => String(s.precio ?? 0) },
  ];

  protected readonly productoLabelFn = (p: ProductoOutput) => `${p.codigo ?? ''} - ${p.nombre ?? ''}`;
  protected readonly productoKeyFn = (p: ProductoOutput) => String(p.id_producto);
  protected readonly servicioLabelFn = (s: ServicioOutput) => `${s.codigo ?? ''} - ${s.nombre ?? ''}`;
  protected readonly servicioKeyFn = (s: ServicioOutput) => String(s.id_servicio);

  ngOnInit(): void {
    this.fetchProductos(0, 10, '');
    this.fetchServicios(0, 10, '');
    this.detalleForm.get('tipo')?.valueChanges.subscribe(() => {
      this.detalleForm.patchValue({ id_item: '', precio_unitario: 0, descripcion: '' });
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

  protected fetchServicios(page: number, size: number, filter: string): void {
    this.loadingServicios.set(true);
    this.servicioService.findPaginated(page, size, filter).subscribe({
      next: (res) => {
        this.servicios.set(res.content);
        this.serviciosTotal.set(res.pageInfo.totalElements);
        this.loadingServicios.set(false);
      },
      error: () => this.loadingServicios.set(false),
    });
  }

  protected onProductoSelected(producto: ProductoOutput | null): void {
    this.detalleForm.patchValue({
      id_item: producto?.id_producto ? String(producto.id_producto) : '',
      precio_unitario: producto?.precioVenta ?? 0,
      descripcion: producto?.nombre ?? '',
    });
  }

  protected onServicioSelected(servicio: ServicioOutput | null): void {
    this.detalleForm.patchValue({
      id_item: servicio?.id_servicio ? String(servicio.id_servicio) : '',
      precio_unitario: servicio?.precio ?? 0,
      descripcion: servicio?.nombre ?? '',
    });
  }

  protected onAddServicio(): void {
    this.dialogService
      .openForm(ServicioFormComponent, {
        title: 'Nuevo Servicio',
        subtitle: 'Crea un nuevo servicio',
        maxWidth: '760px',
      })
      .subscribe((saved) => {
        if (saved) {
          this.fetchServicios(0, 10, '');
        }
      });
  }

  protected agregarDetalle(): void {
    const orden = this.orden();
    if (this.detalleForm.invalid || !orden.id_orden_trabajo) {
      this.detalleForm.markAllAsTouched();
      return;
    }

    this.isAdding.set(true);
    const val = this.detalleForm.getRawValue();
    const input: OrdenTrabajoDetalleInput = {
      tipo: val.tipo!,
      cantidad: Number(val.cantidad),
      precio_unitario: Number(val.precio_unitario),
      descripcion: val.descripcion,
    };
    if (val.tipo === 'PRODUCTO') {
      input.id_producto = val.id_item;
    } else {
      input.id_servicio = val.id_item;
    }

    this.ordenService.agregarDetalle(orden.id_orden_trabajo, input).subscribe({
      next: (updated) => {
        this.ordenChange.emit(updated);
        this.isAdding.set(false);
        this.detalleForm.patchValue({
          id_item: '',
          cantidad: 1,
          precio_unitario: 0,
          descripcion: '',
        });
        this.detalleForm.markAsUntouched();
      },
      error: (err) => {
        this.errorChange.emit(err?.message ?? 'No se pudo agregar el detalle');
        this.isAdding.set(false);
      },
    });
  }

  protected eliminarDetalle(det: OrdenTrabajoDetalleOutput): void {
    const orden = this.orden();
    if (!orden.id_orden_trabajo || !det.id_detalle) {
      return;
    }
    if (!confirm('¿Eliminar este ítem del presupuesto?')) {
      return;
    }
    this.ordenService.eliminarDetalle(orden.id_orden_trabajo, det.id_detalle).subscribe({
      next: (updated) => this.ordenChange.emit(updated),
      error: (err) => this.errorChange.emit(err?.message ?? 'No se pudo eliminar el detalle'),
    });
  }

  protected nombreItem(det: OrdenTrabajoDetalleOutput): string {
    if (det.tipo === 'PRODUCTO') {
      return det.nombre_producto || det.descripcion || '';
    }
    return det.nombre_servicio || det.descripcion || '';
  }
}
