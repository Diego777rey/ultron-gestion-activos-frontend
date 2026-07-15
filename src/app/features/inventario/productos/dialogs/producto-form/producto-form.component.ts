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

  protected readonly categoriasRaiz = signal<CategoriaProductoOutput[]>([]);
  protected readonly subcategorias = signal<CategoriaProductoOutput[]>([]);

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
    idCategoriaRaiz: [0, [Validators.required, Validators.min(1)]],
    idSubcategoria: [0],
  });

  constructor() {
    this.loadCategoriasRaiz();

    effect(() => {
      const p = this.producto();
      if (p) {
        this.isEdit = !!p.id_producto;
        const cat = p.categoriaProducto;
        let rootId = 0;
        let subId = 0;
        if (cat?.categoriaPadre?.id_categoria_producto) {
          rootId = cat.categoriaPadre.id_categoria_producto;
          subId = cat.id_categoria_producto ?? 0;
        } else {
          rootId = cat?.id_categoria_producto ?? 0;
        }
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
          idCategoriaRaiz: rootId,
          idSubcategoria: subId,
        });
        if (rootId) {
          this.loadSubcategorias(rootId, subId);
        }
      } else {
        this.isEdit = false;
        this.subcategorias.set([]);
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
          idCategoriaRaiz: 0,
          idSubcategoria: 0,
        });
      }
    });
  }

  private loadCategoriasRaiz(): void {
    this.categoriaService.findRaices().subscribe({
      next: (cats) => this.categoriasRaiz.set(cats),
      error: () => (this.error = 'No se pudieron cargar las categorías'),
    });
  }

  private loadSubcategorias(idRaiz: number, preselectSubId = 0): void {
    this.categoriaService.findSubcategorias(idRaiz).subscribe({
      next: (subs) => {
        this.subcategorias.set(subs);
        if (preselectSubId) {
          this.form.controls.idSubcategoria.setValue(preselectSubId);
        }
      },
      error: () => this.subcategorias.set([]),
    });
  }

  protected onRootChange(): void {
    const rootId = Number(this.form.controls.idCategoriaRaiz.value);
    this.form.controls.idSubcategoria.setValue(0);
    this.subcategorias.set([]);
    if (rootId > 0) {
      this.loadSubcategorias(rootId);
    }
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const p = this.producto();

    const idCategoriaProducto = Number(v.idSubcategoria) > 0
      ? Number(v.idSubcategoria)
      : Number(v.idCategoriaRaiz);

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
      idCategoriaProducto,
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
