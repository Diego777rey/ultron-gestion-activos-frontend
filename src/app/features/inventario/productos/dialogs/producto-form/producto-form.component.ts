import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ProductoInput, ProductoOutput, CategoriaProductoOutput } from '../../interfaces/producto.interface';
import { ProductoService } from '../../services/producto.service';
import { CategoriaProductoService } from '../../services/categoria-producto.service';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-producto-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    AutofocusDirective,
    UppercaseDirective,
    EntitySearcherComponent,
  ],
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
  protected readonly selectedCategoria = signal<CategoriaProductoOutput | null>(null);
  protected readonly selectedSubcategoria = signal<CategoriaProductoOutput | null>(null);
  protected readonly loadingCategorias = signal(false);
  protected readonly loadingSubcategorias = signal(false);

  protected readonly categoriaColumns: TableColumn<CategoriaProductoOutput>[] = [
    { key: 'id_categoria_producto', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (c) => c.nombre ?? '' },
    { key: 'descripcion', header: 'Descripción', value: (c) => c.descripcion ?? '' },
  ];

  protected readonly categoriasDisponibles = computed(() => {
    const list = this.categoriasRaiz();
    const selected = this.selectedCategoria();
    if (selected && !list.find((c) => c.id_categoria_producto === selected.id_categoria_producto)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly subcategoriasDisponibles = computed(() => {
    const list = this.subcategorias();
    const selected = this.selectedSubcategoria();
    if (selected && !list.find((c) => c.id_categoria_producto === selected.id_categoria_producto)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
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
        let root: CategoriaProductoOutput | null = null;
        let sub: CategoriaProductoOutput | null = null;
        let rootId = 0;
        let subId = 0;

        if (cat?.categoriaPadre?.id_categoria_producto) {
          root = cat.categoriaPadre;
          sub = cat;
          rootId = cat.categoriaPadre.id_categoria_producto;
          subId = cat.id_categoria_producto ?? 0;
        } else if (cat?.id_categoria_producto) {
          root = cat;
          rootId = cat.id_categoria_producto;
        }

        this.selectedCategoria.set(root);
        this.selectedSubcategoria.set(sub);
        this.form.reset({
          codigo: p.codigo,
          nombre: p.nombre,
          descripcion: p.descripcion ?? '',
          estado: p.estado ?? true,
          idCategoriaRaiz: rootId,
          idSubcategoria: subId,
        });
        if (rootId) {
          this.loadSubcategorias(rootId);
        } else {
          this.subcategorias.set([]);
        }
      } else {
        this.isEdit = false;
        this.selectedCategoria.set(null);
        this.selectedSubcategoria.set(null);
        this.subcategorias.set([]);
        this.form.reset({
          codigo: '',
          nombre: '',
          descripcion: '',
          estado: true,
          idCategoriaRaiz: 0,
          idSubcategoria: 0,
        });
      }
    });
  }

  private loadCategoriasRaiz(): void {
    this.loadingCategorias.set(true);
    this.categoriaService.findRaices().subscribe({
      next: (cats) => {
        this.categoriasRaiz.set(cats);
        this.loadingCategorias.set(false);
      },
      error: () => {
        this.error = 'No se pudieron cargar las categorías';
        this.loadingCategorias.set(false);
      },
    });
  }

  private loadSubcategorias(idRaiz: number): void {
    this.loadingSubcategorias.set(true);
    this.categoriaService.findSubcategorias(idRaiz).subscribe({
      next: (subs) => {
        this.subcategorias.set(subs);
        this.loadingSubcategorias.set(false);
      },
      error: () => {
        this.subcategorias.set([]);
        this.loadingSubcategorias.set(false);
      },
    });
  }

  protected onCategoriaSelected(categoria: CategoriaProductoOutput | null): void {
    this.selectedCategoria.set(categoria);
    this.selectedSubcategoria.set(null);
    this.form.controls.idCategoriaRaiz.setValue(categoria?.id_categoria_producto ?? 0);
    this.form.controls.idCategoriaRaiz.markAsTouched();
    this.form.controls.idSubcategoria.setValue(0);
    this.subcategorias.set([]);

    const rootId = categoria?.id_categoria_producto;
    if (rootId) {
      this.loadSubcategorias(rootId);
    }
  }

  protected onSubcategoriaSelected(subcategoria: CategoriaProductoOutput | null): void {
    this.selectedSubcategoria.set(subcategoria);
    this.form.controls.idSubcategoria.setValue(subcategoria?.id_categoria_producto ?? 0);
  }

  protected readonly categoriaLabelFn = (c: CategoriaProductoOutput) =>
    c.nombre ?? `Categoría #${c.id_categoria_producto}`;
  protected readonly categoriaKeyFn = (c: CategoriaProductoOutput) => c.id_categoria_producto;
  protected readonly subcategoriaLabelFn = (c: CategoriaProductoOutput) =>
    c.nombre ?? `Subcategoría #${c.id_categoria_producto}`;
  protected readonly subcategoriaKeyFn = (c: CategoriaProductoOutput) => c.id_categoria_producto;

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
      precioCompra: p?.precioCompra ?? 0,
      precioVenta: p?.precioVenta ?? 0,
      stock: p?.stock ?? 0,
      stockMinimo: p?.stockMinimo ?? 0,
      ubicacion: p?.ubicacion,
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
