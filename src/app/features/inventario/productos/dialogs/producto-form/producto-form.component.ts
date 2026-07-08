import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { ProductoInput, ProductoOutput, CategoriaProductoOutput } from '../../interfaces/producto.interface';
import { ProductoService } from '../../services/producto.service';
import { CategoriaProductoService } from '../../services/categoria-producto.service';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-producto-form',
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './producto-form.component.html',
  styleUrl: './producto-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly productoService = inject(ProductoService);
  private readonly categoriaService = inject(CategoriaProductoService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly producto = input<ProductoOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly categorias = signal<CategoriaProductoOutput[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
    precioCompra: [0, [Validators.min(0)]],
    precioVenta: [0, [Validators.required, Validators.min(0)]],
    stock: [0, [Validators.required, Validators.min(0)]],
    stockMinimo: [0, [Validators.required, Validators.min(0)]],
    ubicacion: [''],
    estado: [true],
    idCategoriaProducto: [0, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.loadCategorias();

    effect(() => {
      const p = this.producto();
      if (p) {
        this.isEdit = !!p.id_producto;
        this.form.reset({
          codigo: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion ?? '',
          precioCompra: p.precioCompra ?? 0,
          precioVenta: p.precioVenta,
          stock: p.stock,
          stockMinimo: p.stockMinimo,
          ubicacion: p.ubicacion ?? '',
          estado: p.estado ?? true,
          idCategoriaProducto: p.categoriaProducto?.id_categoria_producto ?? 0,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          codigo: '',
          nombre: '',
          descripcion: '',
          precioCompra: 0,
          precioVenta: 0,
          stock: 0,
          stockMinimo: 0,
          ubicacion: '',
          estado: true,
          idCategoriaProducto: 0,
        });
      }
    });
  }

  private loadCategorias(): void {
    this.categoriaService.findAll().subscribe({
      next: (cats) => this.categorias.set(cats),
      error: () => this.error = 'No se pudieron cargar las categorías'
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const p = this.producto();
    
    const payload: ProductoInput = {
      codigo: v.codigo.trim(),
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      precioCompra: v.precioCompra,
      precioVenta: v.precioVenta,
      stock: v.stock,
      stockMinimo: v.stockMinimo,
      ubicacion: v.ubicacion?.trim() || undefined,
      estado: v.estado,
      idCategoriaProducto: Number(v.idCategoriaProducto),
    };

    this.saving = true;
    const request = (p && p.id_producto) 
      ? this.productoService.update(p.id_producto, payload)
      : this.productoService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el producto';
      },
    });
  }
}
