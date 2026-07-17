import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { CategoriaServicioService, CategoriaServicioInput } from '../../services/categoria-servicio.service';
import { CategoriaServicioOutput } from '../../interfaces/servicio.interface';

interface StepDef {
  index: number;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-categoria-servicio-stepper',
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './categoria-servicio-stepper.component.html',
  styleUrl: './categoria-servicio-stepper.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-list-view' },
})
export class CategoriaServicioStepperComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly categoriaService = inject(CategoriaServicioService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly steps: StepDef[] = [
    { index: 1, label: 'Categoría', icon: 'category' },
    { index: 2, label: 'Subcategorías', icon: 'account_tree' },
  ];

  protected readonly currentStep = signal(1);
  protected readonly savingCategoria = signal(false);
  protected readonly savingSub = signal(false);
  protected readonly loadingSubs = signal(false);
  protected readonly error = signal<string | null>(null);

  /** Categoría padre ya creada/editada. */
  protected readonly categoria = signal<CategoriaServicioOutput | null>(null);
  protected readonly subcategorias = signal<CategoriaServicioOutput[]>([]);

  protected readonly isEdit = signal(false);

  protected readonly categoriaForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
    estado: [true],
  });

  protected readonly subForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
    estado: [true],
  });

  protected readonly tituloPaso = computed(() =>
    this.currentStep() === 1 ? 'Datos de la categoría' : 'Subcategorías de la categoría'
  );

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.isEdit.set(true);
      this.cargarParaEdicion(Number(idParam));
    }
  }

  private cargarParaEdicion(id: number): void {
    this.categoriaService.findById(id).subscribe({
      next: (cat) => {
        if (!cat) {
          this.error.set('No se encontró la categoría');
          return;
        }
        this.categoria.set(cat);
        this.categoriaForm.reset({
          nombre: cat.nombre,
          descripcion: cat.descripcion ?? '',
          estado: cat.estado ?? true,
        });
        this.cargarSubcategorias(id);
      },
      error: (err: Error) => this.error.set(err.message || 'No se pudo cargar la categoría'),
    });
  }

  private cargarSubcategorias(idPadre: number): void {
    this.loadingSubs.set(true);
    this.categoriaService.findSubcategorias(idPadre).subscribe({
      next: (subs) => {
        this.subcategorias.set(subs);
        this.loadingSubs.set(false);
      },
      error: () => this.loadingSubs.set(false),
    });
  }

  protected guardarCategoria(): void {
    if (this.categoriaForm.invalid) {
      this.categoriaForm.markAllAsTouched();
      return;
    }
    const v = this.categoriaForm.getRawValue();
    const payload: CategoriaServicioInput = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      estado: v.estado,
    };

    this.savingCategoria.set(true);
    this.error.set(null);
    const existente = this.categoria();
    const request = existente?.id_categoria_servicio
      ? this.categoriaService.update(existente.id_categoria_servicio, payload)
      : this.categoriaService.create(payload);

    request.subscribe({
      next: (cat) => {
        this.savingCategoria.set(false);
        this.categoria.set(cat);
        if (cat.id_categoria_servicio) {
          this.cargarSubcategorias(cat.id_categoria_servicio);
        }
        this.currentStep.set(2);
      },
      error: (err: Error) => {
        this.savingCategoria.set(false);
        this.error.set(err.message || 'No se pudo guardar la categoría');
      },
    });
  }

  protected volverPaso1(): void {
    this.currentStep.set(1);
  }

  protected agregarSubcategoria(): void {
    const padre = this.categoria();
    if (!padre?.id_categoria_servicio) {
      this.error.set('Primero registra la categoría principal');
      return;
    }
    if (this.subForm.invalid) {
      this.subForm.markAllAsTouched();
      return;
    }
    const v = this.subForm.getRawValue();
    const payload: CategoriaServicioInput = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      estado: v.estado,
      idCategoriaPadre: padre.id_categoria_servicio,
    };

    this.savingSub.set(true);
    this.error.set(null);
    this.categoriaService.create(payload).subscribe({
      next: (sub) => {
        this.savingSub.set(false);
        this.subcategorias.update((list) => [...list, sub]);
        this.subForm.reset({ nombre: '', descripcion: '', estado: true });
      },
      error: (err: Error) => {
        this.savingSub.set(false);
        this.error.set(err.message || 'No se pudo agregar la subcategoría');
      },
    });
  }

  protected eliminarSubcategoria(sub: CategoriaServicioOutput): void {
    if (!sub.id_categoria_servicio) {
      return;
    }
    this.categoriaService.remove(sub.id_categoria_servicio).subscribe({
      next: () => {
        this.subcategorias.update((list) =>
          list.filter((s) => s.id_categoria_servicio !== sub.id_categoria_servicio)
        );
      },
      error: (err: Error) => this.error.set(err.message || 'No se pudo eliminar la subcategoría'),
    });
  }

  protected finalizar(): void {
    this.router.navigate(['/inventario/servicios/categorias']);
  }

  protected cancelar(): void {
    this.router.navigate(['/inventario/servicios/categorias']);
  }
}
