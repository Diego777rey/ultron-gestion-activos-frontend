import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { finalize } from 'rxjs';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { CotizacionService } from '../../services/cotizacion.service';
import { CotizacionInput, CotizacionOutput } from '../../interfaces/cotizacion.interface';

@Component({
  selector: 'app-cotizacion-form',
  imports: [ReactiveFormsModule, UiButtonComponent],
  templateUrl: './cotizacion-form.component.html',
  styleUrl: './cotizacion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizacionFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly cotizacionService = inject(CotizacionService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly cotizacion = input<CotizacionOutput | null>(null);

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.cotizacion()?.id_cotizacion != null);

  protected readonly form = this.fb.nonNullable.group({
    moneda: ['', [Validators.required, Validators.maxLength(80)]],
    valor: [0, [Validators.required, Validators.min(0)]],
    activa: [true],
  });

  constructor() {
    effect(() => {
      const cotizacion = this.cotizacion();
      if (!cotizacion) {
        return;
      }
      this.form.patchValue({
        moneda: cotizacion.moneda,
        valor: cotizacion.valor,
        activa: cotizacion.activa ?? true,
      });
    });
  }

  protected cancel(): void {
    this.dialogRef?.close(undefined);
  }

  protected submit(): void {
    const moneda = this.form.controls.moneda.value.trim();
    if (!moneda) {
      this.form.controls.moneda.setErrors({ required: true });
    }

    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const input: CotizacionInput = {
      moneda,
      valor: value.valor,
      activa: value.activa,
    };

    const cotizacion = this.cotizacion();
    const operation = cotizacion
      ? this.cotizacionService.update(cotizacion.id_cotizacion, input)
      : this.cotizacionService.create(input);

    operation.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: () => this.dialogRef?.close(true),
      error: (err: Error) => {
        this.error.set(err.message || 'No se pudo guardar la cotización');
      },
    });
  }
}
