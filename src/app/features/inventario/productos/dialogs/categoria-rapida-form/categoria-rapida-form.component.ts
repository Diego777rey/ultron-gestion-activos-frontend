import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../shared/directives/autofocus.directive';
import { UppercaseDirective } from '../../../../../shared/directives/uppercase.directive';
import { CategoriaProductoService, CategoriaProductoInput } from '../../services/categoria-producto.service';
import { CategoriaProductoOutput } from '../../interfaces/producto.interface';
import { DialogRef } from '@angular/cdk/dialog';

@Component({
  selector: 'app-categoria-rapida-form',
  imports: [CommonModule, ReactiveFormsModule, UiButtonComponent, AutofocusDirective, UppercaseDirective],
  template: `
    @if (error()) {
      <div class="form-error" role="alert">
        <span class="material-icons" aria-hidden="true">error_outline</span>
        <span>{{ error() }}</span>
      </div>
    }

    <form class="form" [formGroup]="form" (ngSubmit)="onSubmit()">
      <div class="field">
        <label class="field__label" for="cat-nombre">Nombre*</label>
        <input id="cat-nombre" class="field__input" type="text" formControlName="nombre" appAutofocus appUppercase placeholder="Ej: BEBIDAS" />
        @if (form.controls.nombre.touched && form.controls.nombre.invalid) {
          <span class="field__error">El nombre es obligatorio</span>
        }
      </div>

      <div class="field">
        <label class="field__label" for="cat-descripcion">Descripción</label>
        <input id="cat-descripcion" class="field__input" type="text" formControlName="descripcion" appUppercase placeholder="Opcional" />
      </div>

      <label class="checkbox">
        <input type="checkbox" formControlName="estado" />
        Activo
      </label>
    </form>

    <div class="form-footer">
      <app-ui-button label="Cancelar" variant="ghost" (clicked)="dialogRef?.close()" />
      <app-ui-button label="Guardar" icon="save" variant="primary" [loading]="saving()" (clicked)="onSubmit()" />
    </div>
  `,
  styles: `
    :host { display: block; }
    .form-error {
      display: flex; align-items: center; gap: 8px; margin-bottom: 14px;
      padding: 10px 12px; border-radius: 8px; font-size: 13px;
      background: rgba(255, 61, 113, 0.1); border: 1px solid rgba(255, 61, 113, 0.3); color: #ff8aa3;
    }
    .form { display: flex; flex-direction: column; gap: 14px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field__label { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.72); }
    .field__input {
      height: 38px; padding: 8px 10px; border-radius: 8px; font: inherit; font-size: 13px; color: #f5f5f5;
      background: rgba(255,255,255,0.06); border: 1px solid rgba(148,163,184,0.22); outline: none;
    }
    .field__input:focus { border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(25,118,210,0.18); }
    .field__error { font-size: 11px; color: #ff8aa3; }
    .checkbox { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.88); cursor: pointer; }
    .checkbox input { accent-color: var(--primary-color); width: 16px; height: 16px; }
    .form-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.1); }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoriaRapidaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly categoriaService = inject(CategoriaProductoService);
  readonly dialogRef = inject(DialogRef<CategoriaProductoOutput | undefined>, { optional: true });

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: [''],
    estado: [true],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: CategoriaProductoInput = {
      nombre: v.nombre.trim(),
      descripcion: v.descripcion?.trim() || undefined,
      estado: v.estado,
    };
    this.saving.set(true);
    this.error.set(null);
    this.categoriaService.create(payload).subscribe({
      next: (cat) => {
        this.saving.set(false);
        this.dialogRef?.close(cat);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.error.set(err.message || 'No se pudo guardar la categoría');
      },
    });
  }
}
