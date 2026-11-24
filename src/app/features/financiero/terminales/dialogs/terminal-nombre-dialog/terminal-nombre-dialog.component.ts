import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogRef } from '@angular/cdk/dialog';
import { UiButtonComponent } from '../../../../../shared/components/ui-button/ui-button';
import { TerminalService } from '../../services/terminal.service';
import { TerminalOutput } from '../../interfaces/terminal.interface';
import { NotifyErrorComponent } from '../../../../../shared/components/notify-error/notify-error';

@Component({
  selector: 'app-terminal-nombre-dialog',
  imports: [NotifyErrorComponent, ReactiveFormsModule, UiButtonComponent],
  templateUrl: './terminal-nombre-dialog.component.html',
  styleUrl: './terminal-nombre-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalNombreDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly terminalService = inject(TerminalService);
  private readonly dialogRef = inject(DialogRef, { optional: true });

  readonly terminal = input.required<TerminalOutput>();
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(255)]],
    activa: [true],
  });

  constructor() {
    effect(() => {
      const t = this.terminal();
      this.form.reset({
        nombre: t.nombre || t.hostname || '',
        activa: t.activa !== false,
      });
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.error.set(null);
    this.terminalService
      .actualizar(this.terminal().id_terminal, {
        nombre: v.nombre.trim(),
        activa: v.activa,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.saved.emit();
          this.dialogRef?.close(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.error.set(err.message || 'No se pudo actualizar la terminal');
        },
      });
  }
}
