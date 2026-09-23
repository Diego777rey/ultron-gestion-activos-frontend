import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { BaseFormDialog } from '../../../../../shared/components/modal/base-form-dialog';
import { ErrorBannerComponent } from '../../../../../shared/components/error-banner/error-banner';
import { CotizacionService } from '../../services/cotizacion.service';
import { CotizacionInput, CotizacionOutput, Moneda } from '../../interfaces/cotizacion.interface';

@Component({
  selector: 'app-cotizacion-form',
  imports: [
    ReactiveFormsModule,
    UiButtonComponent,
    ErrorBannerComponent,
  ],
  templateUrl: './cotizacion-form.component.html',
  styleUrl: './cotizacion-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CotizacionFormComponent extends BaseFormDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cotizacionService = inject(CotizacionService);

  readonly cotizacion = input<CotizacionOutput | undefined>();

  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly monedas: { value: Moneda; label: string }[] = [
    { value: 'REAL', label: 'Real Brasileño' },
    { value: 'GUARANI', label: 'Guaraní' },
    { value: 'DOLAR', label: 'Dólar' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    moneda: ['GUARANI' as Moneda, [Validators.required]],
    valor: [0, [Validators.required, Validators.min(0)]],
    activa: [true],
  });

  ngOnInit(): void {
    const cotizacion = this.cotizacion();
    if (cotizacion) {
      this.form.patchValue({
        moneda: cotizacion.moneda,
        valor: cotizacion.valor,
        activa: cotizacion.activa ?? true,
      });
    }
  }

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    const input: CotizacionInput = {
      moneda: value.moneda,
      valor: value.valor,
      activa: value.activa,
    };

    const cotizacion = this.cotizacion();
    const operation = cotizacion
      ? this.cotizacionService.update(cotizacion.id_cotizacion, input)
      : this.cotizacionService.create(input);

    operation
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => this.close(true),
        error: (err: Error) => {
          this.error.set(err.message || 'Error al guardar la cotización');
        },
      });
  }
}
