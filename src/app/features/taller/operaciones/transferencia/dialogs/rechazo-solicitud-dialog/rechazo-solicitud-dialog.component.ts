import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../../shared/components/ui-button/ui-button';
import { AutofocusDirective } from '../../../../../../shared/directives/autofocus.directive';

@Component({
  selector: 'app-rechazo-solicitud-dialog',
  imports: [ReactiveFormsModule, UiButtonComponent, AutofocusDirective],
  templateUrl: './rechazo-solicitud-dialog.component.html',
  styleUrl: './rechazo-solicitud-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RechazoSolicitudDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(DialogRef<string | undefined>, { optional: true });

  readonly numeroOrden = input('');
  readonly origenNombre = input('');
  readonly destinoNombre = input('');

  protected readonly form = this.fb.nonNullable.group({
    observacion: ['', Validators.required],
  });

  protected cancelar(): void {
    this.dialogRef?.close(undefined);
  }

  protected confirmar(): void {
    const observacion = this.form.controls.observacion.value.trim();
    if (!observacion) {
      this.form.controls.observacion.setErrors({ required: true });
      this.form.controls.observacion.markAsTouched();
      return;
    }
    this.dialogRef?.close(observacion.toUpperCase());
  }
}
