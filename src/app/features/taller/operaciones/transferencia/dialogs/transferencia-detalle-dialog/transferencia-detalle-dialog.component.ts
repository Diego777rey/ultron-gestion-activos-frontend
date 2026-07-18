import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { DefaultEmptyPipe } from '../../../../../../shared/pipes/default-empty.pipe';
import { TransferenciaOutput } from '../../interfaces/transferencia.interface';

@Component({
  selector: 'app-transferencia-detalle-dialog',
  imports: [DefaultEmptyPipe, DecimalPipe],
  templateUrl: './transferencia-detalle-dialog.component.html',
  styleUrl: './transferencia-detalle-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TransferenciaDetalleDialogComponent {
  readonly transferencia = input<TransferenciaOutput | null>(null);
}
