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

  protected readonly categorias = signal<CategoriaServicioOutput[]>([]);

  protected readonly form = this.fb.nonNullable.group({
    codigo: ['', [Validators.maxLength(50)]],
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0)]],
    estado: [true],
    idCategoriaServicio: [0, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    this.loadCategorias();

    effect(() => {
      const s = this.servicio();
      if (s) {
        this.isEdit = !!s.id_servicio;
        this.form.reset({
          codigo: s.codigo ?? '',
          nombre: s.nombre,
          descripcion: s.descripcion ?? '',
          precio: s.precio,
          estado: s.estado ?? true,
          idCategoriaServicio: s.categoriaServicio?.id_categoria_servicio ?? 0,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          codigo: '',
          nombre: '',
          descripcion: '',
          precio: 0,
          estado: true,
          idCategoriaServicio: 0,
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
    const s = this.servicio();
    
    const payload: ServicioInput = {
      codigo: v.codigo?.trim() || undefined,
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      precio: v.precio,
      estado: v.estado,
      idCategoriaServicio: Number(v.idCategoriaServicio),
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
