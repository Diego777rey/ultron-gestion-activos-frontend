import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../../shared/components/ui-button/ui-button';

@Component({
  selector: 'app-aprobar-solicitud-dialog',
  imports: [UiButtonComponent],
  templateUrl: './aprobar-solicitud-dialog.component.html',
  styleUrl: './aprobar-solicitud-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AprobarSolicitudDialogComponent {
  private readonly dialogRef = inject(DialogRef<boolean | undefined>, { optional: true });

  readonly numeroOrden = input('');
  readonly origenNombre = input('');
  readonly destinoNombre = input('');

  protected cancelar(): void {
    this.dialogRef?.close(undefined);
  }

  protected confirmar(): void {
    this.dialogRef?.close(true);
  }
}
