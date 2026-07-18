import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { EntitySearcherComponent } from '../../../../../shared/components/entity-searcher/entity-searcher';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { TableColumn } from '../../../../../shared/models/table-column.model';
import { ServicioInput, ServicioOutput, CategoriaServicioOutput } from '../../interfaces/servicio.interface';
import { ServicioService } from '../../services/servicio.service';
import { CategoriaServicioService } from '../../services/categoria-servicio.service';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-servicio-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    UiButtonComponent,
    AutofocusDirective,
    UppercaseDirective,
    EntitySearcherComponent,
  ],
  templateUrl: './servicio-form.component.html',
  styleUrl: './servicio-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServicioFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly servicioService = inject(ServicioService);
  private readonly categoriaService = inject(CategoriaServicioService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly servicio = input<ServicioOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly categoriasRaiz = signal<CategoriaServicioOutput[]>([]);
  protected readonly subcategorias = signal<CategoriaServicioOutput[]>([]);
  protected readonly selectedCategoria = signal<CategoriaServicioOutput | null>(null);
  protected readonly selectedSubcategoria = signal<CategoriaServicioOutput | null>(null);
  protected readonly loadingCategorias = signal(false);
  protected readonly loadingSubcategorias = signal(false);

  protected readonly categoriaColumns: TableColumn<CategoriaServicioOutput>[] = [
    { key: 'id_categoria_servicio', header: 'Id', width: '80px' },
    { key: 'nombre', header: 'Nombre', value: (c) => c.nombre ?? '' },
    { key: 'descripcion', header: 'Descripción', value: (c) => c.descripcion ?? '' },
  ];

  protected readonly categoriasDisponibles = computed(() => {
    const list = this.categoriasRaiz();
    const selected = this.selectedCategoria();
    if (selected && !list.find((c) => c.id_categoria_servicio === selected.id_categoria_servicio)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly subcategoriasDisponibles = computed(() => {
    const list = this.subcategorias();
    const selected = this.selectedSubcategoria();
    if (selected && !list.find((c) => c.id_categoria_servicio === selected.id_categoria_servicio)) {
      return [selected, ...list];
    }
    return list;
  });

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    estado: [true],
    idCategoriaRaiz: [0, [Validators.required, Validators.min(1)]],
    idSubcategoria: [0],
  });

  constructor() {
    this.loadCategoriasRaiz();

    effect(() => {
      const s = this.servicio();
      if (s) {
        this.isEdit = !!s.id_servicio;
        const cat = s.categoriaServicio;
        let root: CategoriaServicioOutput | null = null;
        let sub: CategoriaServicioOutput | null = null;
        let rootId = 0;
        let subId = 0;

        if (cat?.categoriaPadre?.id_categoria_servicio) {
          root = cat.categoriaPadre;
          sub = cat;
          rootId = cat.categoriaPadre.id_categoria_servicio;
          subId = cat.id_categoria_servicio ?? 0;
        } else if (cat?.id_categoria_servicio) {
          root = cat;
          rootId = cat.id_categoria_servicio;
        }

        this.selectedCategoria.set(root);
        this.selectedSubcategoria.set(sub);
        this.form.reset({
          codigo: s.codigo ?? '',
          nombre: s.nombre,
          descripcion: s.descripcion ?? '',
          precio: s.precio,
          estado: s.estado ?? true,
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
          precio: 0,
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

  protected onCategoriaSelected(categoria: CategoriaServicioOutput | null): void {
    this.selectedCategoria.set(categoria);
    this.selectedSubcategoria.set(null);
    this.form.controls.idCategoriaRaiz.setValue(categoria?.id_categoria_servicio ?? 0);
    this.form.controls.idCategoriaRaiz.markAsTouched();
    this.form.controls.idSubcategoria.setValue(0);
    this.subcategorias.set([]);

    const rootId = categoria?.id_categoria_servicio;
    if (rootId) {
      this.loadSubcategorias(rootId);
    }
  }

  protected onSubcategoriaSelected(subcategoria: CategoriaServicioOutput | null): void {
    this.selectedSubcategoria.set(subcategoria);
    this.form.controls.idSubcategoria.setValue(subcategoria?.id_categoria_servicio ?? 0);
  }

  protected readonly categoriaLabelFn = (c: CategoriaServicioOutput) =>
    c.nombre ?? `Categoría #${c.id_categoria_servicio}`;
  protected readonly categoriaKeyFn = (c: CategoriaServicioOutput) => c.id_categoria_servicio;
  protected readonly subcategoriaLabelFn = (c: CategoriaServicioOutput) =>
    c.nombre ?? `Subcategoría #${c.id_categoria_servicio}`;
  protected readonly subcategoriaKeyFn = (c: CategoriaServicioOutput) => c.id_categoria_servicio;

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const s = this.servicio();

    const idCategoriaServicio = Number(v.idSubcategoria) > 0
      ? Number(v.idSubcategoria)
      : Number(v.idCategoriaRaiz);

    const payload: ServicioInput = {
      codigo: v.codigo?.trim() || undefined,
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      precio: v.precio,
      estado: v.estado,
      idCategoriaServicio,
    };

    this.saving = true;
    const request = (s && s.id_servicio)
      ? this.servicioService.update(s.id_servicio, payload)
      : this.servicioService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el servicio';
      },
    });
  }
}
