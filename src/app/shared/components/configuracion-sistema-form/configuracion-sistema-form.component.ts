import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../ui-button/ui-button';
import {
  ConfiguracionSistema,
  DEFAULT_CONFIGURACION,
} from '../../models/configuracion-sistema.model';

@Component({
  selector: 'app-configuracion-sistema-form',
  imports: [ReactiveFormsModule, UiButtonComponent],
  templateUrl: './configuracion-sistema-form.component.html',
  styleUrl: './configuracion-sistema-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfiguracionSistemaFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(DialogRef<ConfiguracionSistema | undefined>, { optional: true });

  readonly initial = input<ConfiguracionSistema | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    serverIp: [DEFAULT_CONFIGURACION.serverIp, [Validators.required, Validators.maxLength(255)]],
    serverPort: [
      DEFAULT_CONFIGURACION.serverPort,
      [Validators.required, Validators.pattern(/^\d{2,5}$/)],
    ],
  });

  constructor() {
    effect(() => {
      const value = this.initial();
      if (!value) {
        return;
      }
      this.form.reset({
        serverIp: value.serverIp,
        serverPort: value.serverPort,
      });
    });
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    this.dialogRef?.close({
      serverIp: raw.serverIp.trim(),
      serverPort: raw.serverPort.trim(),
      isConfigured: true,
    });
  }

  protected onCancel(): void {
    this.dialogRef?.close(undefined);
  }
}
