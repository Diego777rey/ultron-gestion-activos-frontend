import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { ServicioInput, ServicioOutput, CategoriaServicioOutput } from '../../interfaces/servicio.interface';
import { ServicioService } from '../../services/servicio.service';
import { CategoriaServicioService } from '../../services/categoria-servicio.service';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-servicio-form',
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
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
        let rootId = 0;
        let subId = 0;
        if (cat?.categoriaPadre?.id_categoria_servicio) {
          rootId = cat.categoriaPadre.id_categoria_servicio;
          subId = cat.id_categoria_servicio ?? 0;
        } else {
          rootId = cat?.id_categoria_servicio ?? 0;
        }
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
          this.loadSubcategorias(rootId, subId);
        }
      } else {
        this.isEdit = false;
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
