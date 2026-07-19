import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../../shared/components/ui-button/ui-button';
import { MotivoRechazoTransferencia } from '../../interfaces/transferencia.interface';

export interface RechazoDetalleResult {
  motivo: MotivoRechazoTransferencia;
  detalle?: string;
}

@Component({
  selector: 'app-rechazo-detalle-dialog',
  imports: [ReactiveFormsModule, UiButtonComponent],
  templateUrl: './rechazo-detalle-dialog.component.html',
  styleUrl: './rechazo-detalle-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechazoDetalleDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(DialogRef<RechazoDetalleResult | undefined>, {
    optional: true,
  });

  readonly productoLabel = input<string>('');

  protected readonly motivos: { value: MotivoRechazoTransferencia; label: string }[] = [
    { value: 'AVERIADO', label: 'Averiado / dañado' },
    { value: 'VENCIDO', label: 'Vencido' },
    { value: 'ENVIADO_MAL', label: 'Enviado mal' },
    { value: 'OTRO', label: 'Otro motivo' },
  ];

  protected readonly form = this.fb.nonNullable.group({
    motivo: ['AVERIADO' as MotivoRechazoTransferencia, Validators.required],
    detalle: [''],
  });

  protected get requiereDetalle(): boolean {
    return this.form.controls.motivo.value === 'OTRO';
  }

  protected cancelar(): void {
    this.dialogRef?.close(undefined);
  }

  protected confirmar(): void {
    const motivo = this.form.controls.motivo.value;
    const detalle = this.form.controls.detalle.value.trim();
    if (motivo === 'OTRO' && !detalle) {
      this.form.controls.detalle.setErrors({ required: true });
      this.form.controls.detalle.markAsTouched();
      return;
    }
    this.dialogRef?.close({
      motivo,
      detalle: detalle || undefined,
    });
  }
}
