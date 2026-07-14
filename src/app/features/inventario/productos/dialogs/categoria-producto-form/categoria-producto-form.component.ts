import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { CategoriaProductoInput, CategoriaProductoService } from '../../services/categoria-producto.service';
import { CategoriaProductoOutput } from '../../interfaces/producto.interface';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-categoria-producto-form',
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './categoria-producto-form.component.html',
  styleUrl: './categoria-producto-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriaProductoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoriaService = inject(CategoriaProductoService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly categoria = input<CategoriaProductoOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
    estado: [true],
  });

  constructor() {
    effect(() => {
      const cat = this.categoria();
      if (cat) {
        this.isEdit = !!cat.id_categoria_producto;
        this.form.reset({
          nombre: cat.nombre,
          descripcion: cat.descripcion ?? '',
          estado: cat.estado ?? true,
        });
      } else {
        this.isEdit = false;
        this.form.reset({
          nombre: '',
          descripcion: '',
          estado: true,
        });
      }
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const cat = this.categoria();
    
    const payload: CategoriaProductoInput = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      estado: v.estado,
    };

    this.saving = true;
    const request = (cat && cat.id_categoria_producto) 
      ? this.categoriaService.update(cat.id_categoria_producto, payload)
      : this.categoriaService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar la categoría';
      },
    });
  }
}
