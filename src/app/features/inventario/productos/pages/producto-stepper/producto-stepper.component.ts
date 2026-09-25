import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { ImageUploaderComponent } from '../../../../../shared/components/image-uploader/image-uploader.component';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { CategoriaProductoService } from '../../services/categoria-producto.service';
import { ProductoService } from '../../services/producto.service';
import { CategoriaProductoOutput, PresentacionProductoOutput, ProductoInput, ProductoOutput } from '../../interfaces/producto.interface';
import { PresentacionesEditorComponent } from '../../components/presentaciones-editor/presentaciones-editor.component';
import { CategoriaRapidaFormComponent } from '../../dialogs/categoria-rapida-form/categoria-rapida-form.component';
import { SubcategoriaFormComponent } from '../../dialogs/subcategoria-form/subcategoria-form.component';
import { ReporteService } from '../../../../../shared/services/reporte.service';

interface StepDef {
  index: number;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-producto-stepper',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    AutofocusDirective,
    UppercaseDirective,
    PresentacionesEditorComponent,
    ImageUploaderComponent,
  ],
  templateUrl: './producto-stepper.component.html',
  styleUrl: './producto-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ProductoStepperComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly dialogService = inject(AppDialogService);
  private readonly categoriaService = inject(CategoriaProductoService);
  private readonly productoService = inject(ProductoService);
  private readonly reporteService = inject(ReporteService);
  private readonly presentacionesEditor = viewChild(PresentacionesEditorComponent);

  protected readonly presentacionesIniciales = signal<PresentacionProductoOutput[]>([]);
  protected readonly productoId = signal<number | null>(null);
  protected readonly productoActual = signal<ProductoOutput | null>(null);
  protected readonly loadingProducto = signal(false);
  protected readonly imagePath = signal<string | null>(null);
  protected readonly imageError = signal<string | null>(null);
  protected readonly editando = computed(() => this.productoId() != null);

  protected readonly steps: StepDef[] = [
    { index: 1, label: 'Categoría', icon: 'category' },
    { index: 2, label: 'Subcategoría', icon: 'account_tree' },
    { index: 3, label: 'Datos generales', icon: 'description' },
  ];

  protected readonly currentStep = signal(1);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly generando = signal(false);

  protected readonly categorias = signal<CategoriaProductoOutput[]>([]);
  protected readonly subcategorias = signal<CategoriaProductoOutput[]>([]);
  protected readonly loadingCategorias = signal(false);
  protected readonly loadingSubcategorias = signal(false);

  protected readonly categoriaSearch = signal('');
  protected readonly subcategoriaSearch = signal('');
  protected readonly catPage = signal(0);
  protected readonly subPage = signal(0);
  protected readonly pageSize = 15;

  protected readonly selectedCategoria = signal<CategoriaProductoOutput | null>(null);
  protected readonly selectedSubcategoria = signal<CategoriaProductoOutput | null>(null);

  protected readonly datosForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
  });

  protected readonly categoriasFiltradas = computed(() => {
    const q = this.categoriaSearch().trim().toLowerCase();
    const list = this.categorias().filter((c) => c.estado !== false);
    if (!q) {
      return list;
    }
    return list.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        String(c.id_categoria_producto ?? '').includes(q) ||
        (c.descripcion ?? '').toLowerCase().includes(q)
    );
  });

  protected readonly subcategoriasFiltradas = computed(() => {
    const q = this.subcategoriaSearch().trim().toLowerCase();
    const list = this.subcategorias().filter((c) => c.estado !== false);
    if (!q) {
      return list;
    }
    return list.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        String(c.id_categoria_producto ?? '').includes(q) ||
        (c.descripcion ?? '').toLowerCase().includes(q)
    );
  });

  protected readonly categoriasPagina = computed(() => {
    const start = this.catPage() * this.pageSize;
    return this.categoriasFiltradas().slice(start, start + this.pageSize);
  });

  protected readonly subcategoriasPagina = computed(() => {
    const start = this.subPage() * this.pageSize;
    return this.subcategoriasFiltradas().slice(start, start + this.pageSize);
  });

  protected readonly catTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.categoriasFiltradas().length / this.pageSize))
  );

  protected readonly subTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.subcategoriasFiltradas().length / this.pageSize))
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.loadCategorias();
    if (idParam) {
      const id = Number(idParam);
      this.productoId.set(id);
      this.cargarProducto(id);
    }
  }

  private cargarProducto(id: number): void {
    this.loadingProducto.set(true);
    this.error.set(null);
    this.productoService.findById(id, true).subscribe({
      next: (producto) => {
        this.loadingProducto.set(false);
        if (!producto) {
          this.error.set('No se encontró el producto');
          return;
        }
        this.productoActual.set(producto);
        this.datosForm.reset({
          nombre: producto.nombre ?? '',
          descripcion: producto.descripcion ?? '',
        });
        this.imagePath.set(producto.imagen ?? null);
        this.presentacionesIniciales.set(producto.presentaciones ?? []);
        const cat = producto.categoriaProducto;
        if (cat?.categoriaPadre?.id_categoria_producto) {
          this.selectedCategoria.set(cat.categoriaPadre);
          this.selectedSubcategoria.set(cat);
          this.loadSubcategorias(cat.categoriaPadre.id_categoria_producto);
        } else if (cat?.id_categoria_producto) {
          this.selectedCategoria.set(cat);
          this.selectedSubcategoria.set(null);
        }
        this.currentStep.set(3);
      },
      error: (err: Error) => {
        this.loadingProducto.set(false);
        this.error.set(err.message || 'No se pudo cargar el producto');
      },
    });
  }

  protected loadCategorias(): void {
    this.loadingCategorias.set(true);
    this.error.set(null);
    this.categoriaService.findRaices().subscribe({
      next: (cats) => {
        this.categorias.set(cats);
        this.loadingCategorias.set(false);
        const selected = this.selectedCategoria();
        if (selected?.id_categoria_producto) {
          const refreshed = cats.find((c) => c.id_categoria_producto === selected.id_categoria_producto);
          if (refreshed) {
            this.selectedCategoria.set(refreshed);
          }
        }
      },
      error: (err: Error) => {
        this.loadingCategorias.set(false);
        this.error.set(err.message || 'No se pudieron cargar las categorías');
      },
    });
  }

  protected loadSubcategorias(idPadre: number): void {
    this.loadingSubcategorias.set(true);
    this.error.set(null);
    this.categoriaService.findSubcategorias(idPadre).subscribe({
      next: (subs) => {
        this.subcategorias.set(subs);
        this.loadingSubcategorias.set(false);
        const selected = this.selectedSubcategoria();
        if (selected?.id_categoria_producto) {
          const refreshed = subs.find((c) => c.id_categoria_producto === selected.id_categoria_producto);
          this.selectedSubcategoria.set(refreshed ?? null);
        }
      },
      error: (err: Error) => {
        this.loadingSubcategorias.set(false);
        this.error.set(err.message || 'No se pudieron cargar las subcategorías');
      },
    });
  }

  protected onCategoriaSearch(value: string): void {
    this.categoriaSearch.set(value);
    this.catPage.set(0);
  }

  protected onSubcategoriaSearch(value: string): void {
    this.subcategoriaSearch.set(value);
    this.subPage.set(0);
  }

  protected selectCategoria(cat: CategoriaProductoOutput): void {
    this.selectedCategoria.set(cat);
    this.selectedSubcategoria.set(null);
    this.subcategorias.set([]);
    this.subcategoriaSearch.set('');
    this.subPage.set(0);
  }

  protected selectSubcategoria(sub: CategoriaProductoOutput): void {
    this.selectedSubcategoria.set(sub);
  }

  protected openNuevaCategoria(): void {
    this.dialogService
      .openForm<CategoriaProductoOutput>(CategoriaRapidaFormComponent, {
        title: 'Crear nueva categoría',
        subtitle: 'Se agregará al catálogo de productos',
        maxWidth: '480px',
      })
      .subscribe((created) => {
        if (created) {
          this.loadCategorias();
          this.selectedCategoria.set(created);
        }
      });
  }

  protected openNuevaSubcategoria(): void {
    const padre = this.selectedCategoria();
    if (!padre?.id_categoria_producto) {
      this.error.set('Seleccioná una categoría antes de crear una subcategoría');
      return;
    }
    this.dialogService
      .openForm<CategoriaProductoOutput>(SubcategoriaFormComponent, {
        title: 'Crear nueva subcategoría',
        subtitle: padre.nombre,
        maxWidth: '480px',
        inputs: {
          idCategoriaPadre: padre.id_categoria_producto,
          nombrePadre: padre.nombre,
        },
      })
      .subscribe((created) => {
        if (created && typeof created === 'object' && 'id_categoria_producto' in created) {
          this.loadSubcategorias(padre.id_categoria_producto!);
          this.selectedSubcategoria.set(created);
        } else if (created) {
          this.loadSubcategorias(padre.id_categoria_producto!);
        }
      });
  }

  protected puedeAvanzar(): boolean {
    if (this.currentStep() === 1) {
      return !!this.selectedCategoria()?.id_categoria_producto;
    }
    if (this.currentStep() === 2) {
      // Subcategoría opcional: se puede avanzar sin ella (producto queda en categoría raíz)
      return true;
    }
    return this.datosForm.valid;
  }

  protected siguiente(): void {
    this.error.set(null);
    const step = this.currentStep();
    if (step === 1) {
      if (!this.selectedCategoria()?.id_categoria_producto) {
        this.error.set('Seleccioná una categoría para continuar');
        return;
      }
      this.loadSubcategorias(this.selectedCategoria()!.id_categoria_producto!);
      this.currentStep.set(2);
      return;
    }
    if (step === 2) {
      this.currentStep.set(3);
      return;
    }
    this.guardarProducto();
  }

  protected atras(): void {
    this.error.set(null);
    const step = this.currentStep();
    if (step <= 1) {
      this.cancelar();
      return;
    }
    if (step === 3) {
      this.conservarPresentaciones();
    }
    this.currentStep.set(step - 1);
  }

  private conservarPresentaciones(): void {
    const editor = this.presentacionesEditor();
    if (!editor) {
      return;
    }
    this.presentacionesIniciales.set(
      editor.toInput().map((fila) => ({
        id_presentacion_producto: fila.id_presentacion_producto ?? undefined,
        descripcion: fila.descripcion,
        cantidad: fila.cantidad,
        precio: fila.precio,
        codigoBarras: fila.codigoBarras,
      }))
    );
  }

  protected onImageChange(path: string | null): void {
    this.imagePath.set(path);
    this.imageError.set(null);
  }

  protected onImageError(message: string): void {
    this.imageError.set(message);
  }

  protected cancelar(): void {
    this.router.navigate(['/inventario/productos']);
  }

  private guardarProducto(): void {
    if (this.datosForm.invalid) {
      this.datosForm.markAllAsTouched();
      this.error.set('Completá el nombre del producto');
      return;
    }
    const categoria = this.selectedCategoria();
    const sub = this.selectedSubcategoria();
    const idCategoriaProducto = sub?.id_categoria_producto ?? categoria?.id_categoria_producto;
    if (!idCategoriaProducto) {
      this.error.set('Falta asociar una categoría al producto');
      return;
    }

    const editor = this.presentacionesEditor();
    if (!editor || editor.invalid() || editor.toInput().length === 0) {
      editor?.marcarErrores();
      this.error.set('Agregá al menos una presentación con descripción, código de barras, cantidad y precio.');
      return;
    }

    const v = this.datosForm.getRawValue();
    const presentaciones = editor.toInput();
    const principal = presentaciones[0];
    const existente = this.productoActual();
    const payload: ProductoInput = {
      codigo: existente?.codigo?.trim() || principal.codigoBarras.trim(),
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      codigoBarras: principal.codigoBarras.trim(),
      precioCompra: existente?.precioCompra ?? 0,
      precioVenta: principal.precio,
      stock: existente?.stock ?? 0,
      stockMinimo: existente?.stockMinimo ?? 0,
      ubicacion: existente?.ubicacion,
      estado: existente?.estado ?? true,
      imagen: this.imagePath() || undefined,
      idCategoriaProducto,
      presentaciones,
    };

    this.saving.set(true);
    this.error.set(null);
    const id = this.productoId();
    const request = id
      ? this.productoService.update(id, payload)
      : this.productoService.create(payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/inventario/productos']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar el producto');
      },
    });
  }

  protected generarReporte(): void {
    if (this.generando()) {
      return;
    }
    this.generando.set(true);
    this.reporteService.generarInventario('producto', this.productoId() ? { id: this.productoId()! } : {}).subscribe({
      next: () => this.generando.set(false),
      error: () => this.generando.set(false),
    });
  }

  protected catRangeLabel(): string {
    const total = this.categoriasFiltradas().length;
    if (total === 0) {
      return '0 - 0 de 0';
    }
    const start = this.catPage() * this.pageSize + 1;
    const end = Math.min((this.catPage() + 1) * this.pageSize, total);
    return `${start} - ${end} de ${total}`;
  }

  protected subRangeLabel(): string {
    const total = this.subcategoriasFiltradas().length;
    if (total === 0) {
      return '0 - 0 de 0';
    }
    const start = this.subPage() * this.pageSize + 1;
    const end = Math.min((this.subPage() + 1) * this.pageSize, total);
    return `${start} - ${end} de ${total}`;
  }
}
