import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { AppDialogService } from '../../../../../shared/services/app-dialog.service';
import { CategoriaProductoService } from '../../services/categoria-producto.service';
import { ProductoService } from '../../services/producto.service';
import { CategoriaProductoOutput, ProductoInput } from '../../interfaces/producto.interface';
import { CategoriaRapidaFormComponent } from '../../dialogs/categoria-rapida-form/categoria-rapida-form.component';
import { SubcategoriaFormComponent } from '../../dialogs/subcategoria-form/subcategoria-form.component';

interface StepDef {
  index: number;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-producto-stepper',
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './producto-stepper.component.html',
  styleUrl: './producto-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class ProductoStepperComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly dialogService = inject(AppDialogService);
  private readonly categoriaService = inject(CategoriaProductoService);
  private readonly productoService = inject(ProductoService);

  protected readonly steps: StepDef[] = [
    { index: 1, label: 'Categoría', icon: 'category' },
    { index: 2, label: 'Subcategoría', icon: 'account_tree' },
    { index: 3, label: 'Datos generales', icon: 'description' },
  ];

  protected readonly currentStep = signal(1);
  protected readonly error = signal<string | null>(null);
  protected readonly saving = signal(false);

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
    codigoBarras: ['', [Validators.required, Validators.maxLength(100)]],
    precioVenta: [0, [Validators.required, Validators.min(0)]],
    descripcion: [''],
  });

  protected readonly datosSnapshot = signal(this.datosForm.getRawValue());

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

  protected readonly resumenNombre = computed(() => this.datosSnapshot().nombre.trim() || '—');
  protected readonly resumenBarcode = computed(() => this.datosSnapshot().codigoBarras.trim() || '—');
  protected readonly resumenPrecio = computed(() => {
    const n = this.datosSnapshot().precioVenta;
    return Number.isFinite(n) ? String(n) : '—';
  });
  protected readonly resumenDescripcion = computed(() => this.datosSnapshot().descripcion.trim() || '—');

  ngOnInit(): void {
    this.datosForm.valueChanges.subscribe(() => {
      this.datosSnapshot.set(this.datosForm.getRawValue());
    });
    this.loadCategorias();
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
    this.currentStep.set(step - 1);
  }

  protected cancelar(): void {
    this.router.navigate(['/inventario/productos']);
  }

  private guardarProducto(): void {
    if (this.datosForm.invalid) {
      this.datosForm.markAllAsTouched();
      this.error.set('Completá nombre, código de barras y precio');
      return;
    }
    const categoria = this.selectedCategoria();
    const sub = this.selectedSubcategoria();
    const idCategoriaProducto = sub?.id_categoria_producto ?? categoria?.id_categoria_producto;
    if (!idCategoriaProducto) {
      this.error.set('Falta asociar una categoría al producto');
      return;
    }

    const v = this.datosForm.getRawValue();
    const codigoBarras = v.codigoBarras.trim();
    const payload: ProductoInput = {
      codigo: codigoBarras,
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      codigoBarras,
      precioCompra: 0,
      precioVenta: v.precioVenta,
      stock: 0,
      stockMinimo: 0,
      estado: true,
      idCategoriaProducto,
    };

    this.saving.set(true);
    this.error.set(null);
    this.productoService.create(payload).subscribe({
      next: () => {
        this.saving.set(false);
        this.router.navigate(['/inventario/productos']);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo registrar el producto');
      },
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
