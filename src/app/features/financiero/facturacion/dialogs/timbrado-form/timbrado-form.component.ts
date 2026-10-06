import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { TimbradoInput, TimbradoOutput } from '../../interfaces/timbrado.interface';
import { TimbradoService } from '../../services/timbrado.service';
import { NotifyErrorComponent } from '../../../../../shared/components/notify-error/notify-error';

@Component({
  selector: 'app-timbrado-form',
  imports: [NotifyErrorComponent, ReactiveFormsModule, UiButtonComponent],
  templateUrl: './timbrado-form.component.html',
  styleUrl: './timbrado-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimbradoFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly timbradoService = inject(TimbradoService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly timbrado = input<TimbradoOutput | null>(null);
  readonly idEmpresa = input.required<number>();
  readonly saved = output<void>();

  protected saving = false;
  protected error: string | null = null;
  protected isEdit = false;

  protected readonly form = this.fb.nonNullable.group({
    numeroTimbrado: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    establecimiento: ['', [Validators.required, Validators.pattern(/^\d{1,3}$/)]],
    puntoExpedicion: ['', [Validators.required, Validators.pattern(/^\d{1,3}$/)]],
    numeroInicial: [null as number | null, [Validators.required, Validators.min(1), Validators.max(9_999_999)]],
    numeroFinal: [null as number | null, [Validators.required, Validators.min(1), Validators.max(9_999_999)]],
    numeroActual: [null as number | null],
    fechaInicioVigencia: ['', Validators.required],
    fechaFinVigencia: ['', Validators.required],
    activo: [true],
  });

  constructor() {
    effect(() => {
      const timbrado = this.timbrado();
      if (timbrado?.id_timbrado) {
        this.isEdit = true;
        this.form.reset({
          numeroTimbrado: timbrado.numero_timbrado ?? '',
          establecimiento: timbrado.establecimiento ?? '',
          puntoExpedicion: timbrado.punto_expedicion ?? '',
          numeroInicial: timbrado.numero_inicial,
          numeroFinal: timbrado.numero_final,
          numeroActual: timbrado.numero_actual,
          fechaInicioVigencia: toInputDate(timbrado.fecha_inicio_vigencia),
          fechaFinVigencia: toInputDate(timbrado.fecha_fin_vigencia),
          activo: timbrado.activo ?? true,
        });
      } else {
        this.isEdit = false;
      }
    });
  }

  protected onSubmit(): void {
    this.error = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const inicial = Number(v.numeroInicial);
    const final = Number(v.numeroFinal);
    const actual = v.numeroActual == null ? null : Number(v.numeroActual);

    if (inicial > final) {
      this.error = 'El número inicial no puede ser mayor que el número final.';
      return;
    }
    if (actual != null && (actual < inicial || actual > final + 1)) {
      this.error = 'El próximo número tiene que estar dentro del rango autorizado.';
      return;
    }
    if (v.fechaInicioVigencia > v.fechaFinVigencia) {
      this.error = 'La vigencia no puede terminar antes de empezar.';
      return;
    }

    const payload: TimbradoInput = {
      numeroTimbrado: v.numeroTimbrado.trim(),
      establecimiento: pad3(v.establecimiento),
      puntoExpedicion: pad3(v.puntoExpedicion),
      numeroInicial: inicial,
      numeroFinal: final,
      numeroActual: actual,
      fechaInicioVigencia: v.fechaInicioVigencia,
      fechaFinVigencia: v.fechaFinVigencia,
      idEmpresa: this.idEmpresa(),
      tipoFactura: 'PAPEL',
      activo: v.activo,
    };

    this.saving = true;
    this.error = null;
    const actualTimbrado = this.timbrado();
    const request = actualTimbrado?.id_timbrado
      ? this.timbradoService.actualizar(actualTimbrado.id_timbrado, payload)
      : this.timbradoService.registrar(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.saved.emit();
        this.dialogRef?.close(true);
      },
      error: (err: Error) => {
        this.saving = false;
        this.error = err.message || 'No se pudo guardar el timbrado';
      },
    });
  }
}

function pad3(value: string): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return digits.slice(0, 3).padStart(3, '0');
}

function toInputDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return '';
}
