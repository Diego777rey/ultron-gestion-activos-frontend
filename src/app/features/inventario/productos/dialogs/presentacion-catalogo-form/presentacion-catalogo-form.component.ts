import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { PresentacionInput, PresentacionOutput } from '../../interfaces/presentacion.interface';
import { PresentacionService } from '../../services/presentacion.service';

@Component({
  selector: 'app-presentacion-catalogo-form',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  templateUrl: './presentacion-catalogo-form.component.html',
  styleUrl: './presentacion-catalogo-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresentacionCatalogoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly presentacionService = inject(PresentacionService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly presentacion = input<PresentacionOutput | null>(null);
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', [Validators.maxLength(255)]],
    estado: [true],
  });

  constructor() {
    effect(() => {
      const p = this.presentacion();
      if (p) {
        this.isEdit = !!p.id_presentacion;
        this.form.reset({
          nombre: p.nombre,
          descripcion: p.descripcion ?? '',
          estado: p.estado ?? true,
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
    const payload: PresentacionInput = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      cantidad: 1,
      estado: v.estado,
    };

    this.saving = true;
    this.error = null;
    const current = this.presentacion();
    const request =
      current?.id_presentacion != null
        ? this.presentacionService.update(current.id_presentacion, payload)
        : this.presentacionService.create(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar la presentación';
      },
    });
  }
}
