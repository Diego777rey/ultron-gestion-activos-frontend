import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { CategoriaServicioService, CategoriaServicioInput } from '../../services/categoria-servicio.service';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-subcategoria-servicio-form',
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './subcategoria-servicio-form.component.html',
  styleUrl: './subcategoria-servicio-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubcategoriaServicioFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoriaService = inject(CategoriaServicioService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly idCategoriaPadre = input<number | null>(null);
  readonly nombrePadre = input<string>('');
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
    estado: [true],
  });

  protected onSubmit(): void {
    const idPadre = this.idCategoriaPadre();
    if (!idPadre) {
      this.error = 'No se pudo identificar la categoría padre';
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: CategoriaServicioInput = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      estado: v.estado,
      idCategoriaPadre: idPadre,
    };

    this.saving = true;
    this.error = null;
    this.categoriaService.create(payload).subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar la subcategoría';
      },
    });
  }
}
